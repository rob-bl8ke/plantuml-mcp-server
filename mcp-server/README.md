# PlantUML MCP Server

An MCP (Model Context Protocol) server that lets any compatible AI assistant generate and render PlantUML diagrams directly from a plain-English technical specification.

---

## How It Works

The server exposes two tools. The AI assistant calls them automatically based on your request — you never write PlantUML manually.

```
Your spec (plain English)
        │
        ▼
  spec_to_diagrams tool
        │
        ├─ Renders prompt template (sequence / class / component / activity)
        ├─ Calls GitHub Models API → generates PlantUML source
        └─ POSTs to Docker encoder → returns Markdown image link
```

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 18+ | Required for built-in `fetch` and ESM |
| Docker Desktop | Runs the PlantUML rendering + encoding services |
| GitHub account with Copilot | Provides the `GITHUB_TOKEN` for the Models API |

---

## Setup

### 1. Start the Docker services

```powershell
cd docker-service
docker compose up -d
```

Confirm both containers are healthy:

```powershell
Invoke-RestMethod http://localhost:9091/health
```

### 2. Install MCP server dependencies

```powershell
cd mcp-server
npm install
```

### 3. Set your GitHub token

The `spec_to_diagrams` tool calls the [GitHub Models API](https://docs.github.com/en/github-models) to generate PlantUML. This requires a token with `models:read` access (a standard GitHub PAT or your Copilot token works).

```powershell
# PowerShell — set for the current session
$env:GITHUB_TOKEN = "github_pat_..."

# Or add it to your user profile to persist it
[System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "github_pat_...", "User")
```

> **Note:** The `.vscode/mcp.json` config passes `${env:GITHUB_TOKEN}` automatically — VS Code reads it from your environment at server start.

### 4. Register with VS Code

The `.vscode/mcp.json` file in this workspace already registers the server. Reload VS Code (or run **Developer: Reload Window**) and the tools will appear in Copilot Chat.

To verify, open Copilot Chat and type `#` — you should see `encode_plantuml` and `spec_to_diagrams` listed.

---

## Tools

### `encode_plantuml`

Encode a PlantUML diagram you've already written and get a Markdown image link back.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `plantuml` | string | — | Raw PlantUML (`@startuml` ... `@enduml`) |
| `title` | string | `diagram` | Alt text and title for the image |
| `format` | `svg`\|`png`\|`txt` | `svg` | Output format |
| `base_url` | string | `http://localhost:9090/plantuml` | Public PlantUML server URL |

**Example prompt:**

> Encode this PlantUML as an SVG: `@startuml\nAlice -> Bob: Hello\n@enduml`

---

### `spec_to_diagrams`

Generate one or more diagrams from a plain-English specification.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `spec` | string | — | Technical description of the system or flow |
| `diagrams` | array | `["sequence"]` | Types: `sequence`, `class`, `component`, `activity` |
| `title_prefix` | string | `diagram` | Prefix for diagram titles, e.g. `checkout-flow` |
| `base_url` | string | `http://localhost:9090/plantuml` | Public PlantUML server URL |
| `format` | `svg`\|`png` | `svg` | Output format |

**Example prompt:**

> Generate a sequence diagram and a component diagram for this spec:
> "The mobile app calls the API Gateway. The gateway authenticates via the Auth Service,
> then routes to the Order Service which reads from a PostgreSQL database."

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_TOKEN` | Yes (for `spec_to_diagrams`) | — | GitHub PAT with `models:read` |
| `GITHUB_MODEL` | No | `gpt-4o-mini` | GitHub Models model name |
| `ENCODER_URL` | No | `http://localhost:9091` | Docker encoder service base URL |
| `PLANTUML_BASE_URL` | No | `http://localhost:9090/plantuml` | Public PlantUML server base URL |

---

## Supported Diagram Types

| Type | Prompt Template |
|---|---|
| `sequence` | `prompts/plantuml-sequence.txt` |
| `class` | `prompts/plantuml-class.txt` |
| `component` | `prompts/plantuml-component.txt` |
| `activity` | `prompts/plantuml-activity.txt` |

---

## Project Structure

```
mcp-server/
├── index.js                  # MCP server entry point
├── package.json
├── .gitignore
├── prompts/
│   ├── plantuml-sequence.txt
│   ├── plantuml-class.txt
│   ├── plantuml-component.txt
│   └── plantuml-activity.txt
└── tools/
    ├── encode.js             # Wraps Docker /encode endpoint
    └── spec-to-diagrams.js   # LLM orchestration + encoding pipeline
```
