# PlantUML MCP Server

An MCP (Model Context Protocol) server that lets any compatible AI assistant generate and render PlantUML diagrams directly from a plain-English technical specification.

---

## How It Works

The server exposes two tools via a **Streamable HTTP endpoint**, running inside the Docker Compose stack alongside the PlantUML rendering and encoding services. VS Code connects to it via a URL — no local Node.js installation required.

```
Your spec (plain English)
        │
        ▼
  spec_to_diagrams tool  (running in Docker on port 3002)
        │
        ├─ Renders prompt template (sequence / class / component / activity)
        ├─ Calls GitHub Models API → generates PlantUML source
        └─ POSTs to encoder container (http://encoder:3000) → Markdown image link
```

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Docker Desktop | Runs all three services in a single stack |
| GitHub Personal Access Token | Required for `spec_to_diagrams` — calls the GitHub Models API |

No local Node.js installation is needed — everything runs inside Docker.

---

## Setup

### 1. Create your `.env` file

```powershell
# PowerShell
Copy-Item docker-service\.env.example docker-service\.env
```
```bash
# Bash
cp docker-service/.env.example docker-service/.env
```

Open `docker-service/.env` and replace the placeholder with your real GitHub token:

```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

To create a token: go to [https://github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token (classic)** → no scopes needed → copy the token.

> `.env` is gitignored and will never be committed.

### 2. Start the full Docker stack

```powershell
# PowerShell
cd docker-service
docker compose up -d --build
```
```bash
# Bash
cd docker-service
docker compose up -d --build
```

Confirm all three containers are healthy:

```powershell
# PowerShell
Invoke-RestMethod http://localhost:3002/health
Invoke-RestMethod http://localhost:9091/health
```
```bash
# Bash
curl http://localhost:3002/health
curl http://localhost:9091/health
```

### 3. Register with VS Code

The `.vscode/mcp.json` in this workspace already points to the running server:

```json
{
  "servers": {
    "plantuml-mcp": {
      "type": "sse",
      "url": "http://localhost:3002/sse"
    }
  }
}
```

Run **Developer: Reload Window** in VS Code — the MCP server connects automatically.

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

All variables are set via `docker-service/.env` (gitignored). See `docker-service/.env.example` for the template.

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_TOKEN` | Yes (for `spec_to_diagrams`) | — | GitHub PAT — set in `docker-service/.env` |
| `GITHUB_MODEL` | No | `gpt-4o-mini` | GitHub Models model name |
| `ENCODER_URL` | No | `http://encoder:3000` | Encoder service URL (internal Docker network) |
| `PLANTUML_BASE_URL` | No | `http://localhost:9090/plantuml` | Public PlantUML server URL embedded in returned links |
| `PORT` | No | `3002` | Port the MCP server listens on |

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
