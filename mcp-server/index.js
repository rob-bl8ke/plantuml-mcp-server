/**
 * index.js — PlantUML MCP Server entry point
 *
 * Exposes two tools to any MCP-compatible AI assistant:
 *
 *   encode_plantuml    — Encode a PlantUML diagram and return a Markdown image link.
 *                        Use this when you have already generated valid PlantUML and
 *                        want to render it as an embedded image.
 *
 *   spec_to_diagrams   — Given a plain-English technical specification, generate one
 *                        or more PlantUML diagrams (sequence, class, component, activity)
 *                        by calling the GitHub Models API and encoding the results.
 *
 * Transport: SSE (Server-Sent Events) over HTTP
 *   - GET  /sse     — VS Code connects here to open the MCP SSE stream
 *   - POST /message — VS Code posts MCP messages here
 *   - GET  /health  — Docker healthcheck endpoint
 *
 * Prerequisites:
 *   - docker compose up -d  (from docker-service/)
 *   - GITHUB_TOKEN env var set (required for spec_to_diagrams)
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { encodePlantuml } from './tools/encode.js';
import { specToDiagrams } from './tools/spec-to-diagrams.js';

// ---------------------------------------------------------------------------
// Server factory — creates a fresh McpServer instance per session.
//
// The MCP SDK does not allow reusing a single McpServer across multiple
// transport connections. Calling server.connect() a second time on the same
// instance throws "Already connected to a transport." Creating one server per
// session is the correct pattern for stateless Streamable HTTP servers.
// ---------------------------------------------------------------------------
function createServer() {
  const server = new McpServer({
    name: 'plantuml-mcp',
    version: '1.0.0',
  });

  // -------------------------------------------------------------------------
  // Tool: encode_plantuml
  //
  // Use this when you have already generated valid PlantUML source and want
  // to get a Markdown image link that renders in a browser or document.
  // -------------------------------------------------------------------------
  server.tool(
    'encode_plantuml',
    'Encode a PlantUML diagram and return a Markdown image link. ' +
    'The diagram must be valid PlantUML starting with @startuml and ending with @enduml.',
    {
      plantuml: z.string().describe('Raw PlantUML source, starting with @startuml and ending with @enduml'),
      title:    z.string().optional().default('diagram').describe('Alt text and title attribute for the image'),
      format:   z.enum(['svg', 'png', 'txt']).optional().default('svg').describe('Output format'),
      base_url: z.string().optional()
        .default('http://localhost:9090/plantuml')
        .describe('Public PlantUML server base URL embedded in the returned link'),
    },
    async ({ plantuml, title, format, base_url }) => {
      try {
        const result = await encodePlantuml({ plantuml, title, format, base_url });
        return {
          content: [{ type: 'text', text: result.markdown }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // Tool: spec_to_diagrams
  //
  // Given a plain-English technical specification, this tool:
  //   1. Renders a prompt for each requested diagram type
  //   2. Calls the GitHub Models API to generate PlantUML source
  //   3. Encodes each diagram via the local Docker service
  //   4. Returns Markdown image links for all diagrams
  //
  // Requires GITHUB_TOKEN environment variable.
  // -------------------------------------------------------------------------
  server.tool(
    'spec_to_diagrams',
    'Generate one or more PlantUML diagrams from a plain-English technical specification ' +
    'and return Markdown image links. Requires GITHUB_TOKEN to be set.',
    {
      spec: z.string().describe(
        'Plain-English description of the system, flow, or architecture to visualise'
      ),
      diagrams: z.array(
        z.enum(['sequence', 'class', 'component', 'activity'])
      ).min(1).default(['sequence']).describe(
        'Diagram types to generate. Supported: sequence, class, component, activity'
      ),
      title_prefix: z.string().optional().default('diagram').describe(
        'Prefix for diagram titles, e.g. "checkout-flow" produces "checkout-flow-sequence"'
      ),
      base_url: z.string().optional()
        .default('http://localhost:9090/plantuml')
        .describe('Public PlantUML server base URL embedded in returned links'),
      format: z.enum(['svg', 'png']).optional().default('svg').describe('Output format'),
    },
    async ({ spec, diagrams, title_prefix, base_url, format }) => {
      try {
        const results = await specToDiagrams({ spec, diagrams, title_prefix, base_url, format });

        const lines = results.map(r => {
          if (r.error) return `**${r.type}** — Error: ${r.error}`;
          return `**${r.title}**\n${r.markdown}`;
        });

        return {
          content: [{ type: 'text', text: lines.join('\n\n') }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}

// ---------------------------------------------------------------------------
// HTTP server with Streamable HTTP transport
//
// VS Code connects by POSTing to /sse to initialize a session, then uses
// the returned session ID for subsequent GET (SSE stream) and POST (messages).
// This is the current MCP protocol VS Code expects — it supersedes legacy SSE.
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3002;
const app = express();
app.use(express.json());

// Track active transports by session ID
const transports = new Map();

// Health check — used by docker-compose healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'plantuml-mcp', transport: 'streamable-http' });
});

// MCP endpoint — handles all Streamable HTTP protocol messages
// VS Code will POST here to initialize, then GET here to open the SSE stream
app.all('/sse', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'];

    if (req.method === 'POST' && !sessionId) {
      // New session — create a fresh server + transport pair per connection.
      // A single McpServer instance cannot be connected to more than one
      // transport; createServer() avoids the "Already connected" error.
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports.set(id, transport);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId);
        }
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } else {
      // Existing session — route to the correct transport
      const transport = transports.get(sessionId);
      if (!transport) {
        return res.status(404).json({ error: `No active session: ${sessionId}` });
      }
      await transport.handleRequest(req, res, req.body);
    }
  } catch (err) {
    console.error('[mcp-server] Error handling request:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PlantUML MCP Server (Streamable HTTP) listening on port ${PORT}`);
  console.log(`  MCP endpoint:  http://0.0.0.0:${PORT}/sse`);
  console.log(`  Health check:  http://0.0.0.0:${PORT}/health`);
});
