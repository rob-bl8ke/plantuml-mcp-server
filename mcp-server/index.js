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
 * Prerequisites:
 *   - Docker services running:  cd docker-service && docker compose up -d
 *   - GITHUB_TOKEN env var set (required for spec_to_diagrams)
 *
 * Start:
 *   node mcp-server/index.js
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { encodePlantuml } from './tools/encode.js';
import { specToDiagrams } from './tools/spec-to-diagrams.js';

const server = new McpServer({
  name: 'plantuml-mcp',
  version: '1.0.0',
});

// ---------------------------------------------------------------------------
// Tool: encode_plantuml
//
// Use this when you have already generated valid PlantUML source and want
// to get a Markdown image link that renders in a browser or document.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Tool: spec_to_diagrams
//
// Given a plain-English technical specification, this tool:
//   1. Renders a prompt for each requested diagram type
//   2. Calls the GitHub Models API to generate PlantUML source
//   3. Encodes each diagram via the local Docker service
//   4. Returns Markdown image links for all diagrams
//
// Requires GITHUB_TOKEN environment variable.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Start server using stdio transport (standard for MCP servers)
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
