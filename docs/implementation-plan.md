## Plan: Full Two-Stage Implementation

**Stage 1** hardens the existing Docker service and test scripts. **Stage 2** builds the MCP server on top of the now-stable infrastructure. A explicit checkpoint separates the two — Stage 2 does not begin until you confirm Stage 1 is working and committed.

---

## Stage 1 — Harden Existing Code

*Fix the four categories of bugs identified in the review. No new files, no new dependencies.*

**Steps**

1. **Fix Docker networking bug** in docker-compose.yml: replace single `PLANTUML_SERVER` env var on the `encoder` service with two vars — `PLANTUML_INTERNAL=http://plantuml-server:8080/plantuml` (container-to-container) and `PLANTUML_PUBLIC=http://localhost:9090/plantuml` (URLs returned to callers)

2. **Update encode-service.js** in encode-service.js:
   - Read `PLANTUML_INTERNAL` and `PLANTUML_PUBLIC` at startup; use `PLANTUML_PUBLIC` when constructing `urls.svg/png/txt`
   - Add `validatePlantuml(input)` helper checking `@startuml`/`@enduml` boundaries; call it at the top of `/encode` and `/markdown` handlers, return 400 with reason on failure
   - Enrich `/health` response to include both server URLs and service version
   - Add `GET /diagram-types` endpoint returning supported diagram types and formats

3. **Update encode-service.md** in encode-service.md to document the new env vars, the updated `/health` response shape, the new `/diagram-types` endpoint, and the 400 validation behaviour

4. **Fix `sed` delimiter bug** in generate-encode.sh and generate-markdown.sh: replace the `sed "s|{{SCENARIO}}|${SCENARIO}|g"` call with `perl -pe "s/\{\{SCENARIO\}\}/${SCENARIO//\//\\/}/g"`

5. **Fix `@startuml` regex** in generate-encode.ps1 and generate-markdown.ps1: change `'(?s)@startuml\s.*?@enduml'` to `'(?s)@startuml.*?@enduml'`

**Stage 1 Verification**
- `docker compose down && docker compose up -d` — both containers reach healthy state
- `curl http://localhost:9091/health` — response includes `plantumlPublic`, `plantumlInternal`, version
- `curl http://localhost:9091/diagram-types` — returns diagram type list
- `curl -X POST http://localhost:9091/encode -H "Content-Type: text/plain" -d "not plantuml"` — returns 400 with reason
- Run `generate-markdown.ps1` and `generate-markdown.sh` with a scenario containing `/` (e.g. `"GET /api/orders is called"`) — both complete without error

---

## ⛔ CHECKPOINT — Test, review, and `git commit` Stage 1 before proceeding

---

## Stage 2 — MCP Server Implementation

*Build the MCP server as a new self-contained package. The Docker service from Stage 1 is its backend.*

**Steps**

1. **Scaffold `mcp-server/` directory** with a `package.json` using `@modelcontextprotocol/sdk` and `zod` as dependencies, and `type: "module"` for ESM. Add a `.gitignore` for `node_modules/`

2. **Copy and extend prompt templates** — create `mcp-server/prompts/` containing:
   - `plantuml-sequence.txt` (copied verbatim from plantuml-sequence.txt)
   - `plantuml-class.txt` — new prompt tuned for class diagrams
   - `plantuml-component.txt` — new prompt tuned for component diagrams
   - `plantuml-activity.txt` — new prompt tuned for activity diagrams

3. **Create `mcp-server/tools/encode.js`** — thin wrapper around the Docker service `/encode` endpoint, accepting `{ plantuml, title, format, base_url }` and returning a Markdown image string

4. **Create `mcp-server/tools/spec-to-diagrams.js`** — orchestrator tool that:
   - Accepts `{ spec, diagrams[], title_prefix, base_url }`
   - Loads the prompt template for each requested diagram type
   - Calls the GitHub Copilot API (or configured LLM) with the rendered prompt
   - Extracts the `@startuml...@enduml` block from the response
   - POSTs to the Docker service `/encode` endpoint
   - Returns an array of `{ type, title, markdown }` objects

5. **Create `mcp-server/index.js`** — MCP server entry point using `McpServer` and `StdioServerTransport` from `@modelcontextprotocol/sdk`. Register two tools:
   - `encode_plantuml` — wraps `mcp-server/tools/encode.js`; input schema: `plantuml`, `title`, `format`, `base_url`
   - `spec_to_diagrams` — wraps `mcp-server/tools/spec-to-diagrams.js`; input schema: `spec`, `diagrams` (enum array), `title_prefix`, `base_url`

6. **Create `mcp-server/README.md`** documenting: prerequisites, how to install deps, how to register the server in VS Code / Claude Desktop (`mcp.json` / `claude_desktop_config.json`), and the input/output contract for both tools

**Stage 2 Verification**
- `node mcp-server/index.js` starts without errors
- Register in VS Code MCP config (`mcp.json`) pointing to `mcp-server/index.js`
- Call `encode_plantuml` tool via Copilot Chat with a raw `@startuml` block — returns a valid Markdown image link
- Call `spec_to_diagrams` with the checkout flow spec from interaction-example.md requesting `["sequence", "component"]` — returns two Markdown image links that render correctly in the browser

**Decisions**
- MCP server is a separate `mcp-server/` package, not folded into docker-service — keeps concerns cleanly separated and makes it independently deployable
- Prompt templates are duplicated into `mcp-server/prompts/` rather than symlinked from prompts — avoids cross-package path coupling; the test-scripts folder is a development tool, not a runtime dependency
- `perl` chosen over `envsubst` for bash template substitution (agreed in earlier discussion)
- Two-tool MCP surface (`encode_plantuml` + `spec_to_diagrams`) matches the interaction example in interaction-example.md