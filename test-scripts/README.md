# Test Scripts (Generate Real PlantUML Diagrams)

This folder contains small "driver" scripts that:

1. Ask GitHub Copilot CLI to generate a PlantUML sequence diagram from a scenario.
2. Send the generated PlantUML text to the local encoder service.
3. Print a ready-to-paste **Markdown image link** that points at a PlantUML server.

When you paste the Markdown into a README (or open the URL directly), you get a *real rendered* diagram.

> Recommended setup: run the Docker services from this repo first (PlantUML server + encoder).

---

## What's in here

- `generate.sh` / `generate.ps1`
  - Convenience wrappers that call the recommended "markdown" approach.
- `generate-markdown.sh` / `generate-markdown.ps1`
  - Calls the encoder's `/markdown` endpoint.
- `generate-encode.sh` / `generate-encode.ps1`
  - Calls the encoder's `/encode` endpoint.

All scripts accept the same positional arguments:

1. `TITLE` (default: `login-sequence`)
2. `SCENARIO` (default: login example)
3. `BASE_URL` (default: `http://localhost:9090/plantuml`)

---

## Expected output

When a script succeeds, it prints a single Markdown image link like:

```text
![<title>](http://localhost:9090/plantuml/svg/<encoded> "<title>")
```

Example:

```text
![login-sequence](http://localhost:9090/plantuml/svg/SoWkIImgAStDuNBCoKnELT2rKt3AJx9Iy4ZDoSddSaZDIm7A0G00 "login-sequence")
```

You can:
- Paste the line into a Markdown file (GitHub README, docs, etc.)
- Or open the URL part directly in a browser to see the rendered SVG

---

## Prerequisites

### 1) Start the Docker services

From the repo root:

```powershell
docker compose -f .\docker-service\docker-compose.yml up -d --build
# or
docker compose -f .\docker-service\docker-compose.yml up -d --force-recreate encoder
```

Quick checks:

```powershell
curl.exe -sS http://localhost:9091/health
curl.exe -sS -I http://localhost:9090/plantuml/ | findstr /R /C:"HTTP/"
```

Expected:
- Encoder health returns JSON with `"status":"ok"`.
- PlantUML server returns `200` or `302`.

### 2) GitHub Copilot CLI

These scripts call the `copilot` command. Make sure it is installed and available on your `PATH`.

Confirm:

```powershell
copilot --version
```

### 3) Bash (optional)

To run the `.sh` scripts on Windows, you'll typically use one of:

- Git Bash
- WSL

The bash scripts also use `jq`.

---

## PowerShell examples (Windows)

Run these from the repo root. All scripts print a single line of Markdown.

If PowerShell blocks script execution, you can allow it for the current session:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

### Example 1: recommended wrapper (defaults)

```powershell
.\test-scripts\generate.ps1
```

### Example 2: custom title

```powershell
.\test-scripts\generate.ps1 "checkout-flow"
```

### Example 3: custom scenario

```powershell
.\test-scripts\generate.ps1 "payment-flow" "User adds items to cart. Proceeds to checkout. Payment is processed."
```

### Example 4: use the encode endpoint explicitly

```powershell
.\test-scripts\generate-encode.ps1 "api-flow" "Client calls API. API validates request. API returns 200."
```

### Example 5: render using a public PlantUML server

This keeps the local encoder (`http://localhost:9091`) but points the generated image URL at a public PlantUML server.

```powershell
.\test-scripts\generate.ps1 "public-render" "Client calls API. API validates request." "http://www.plantuml.com/plantuml"
```

### Example 6: open the rendered diagram in your browser

The scripts output Markdown like:

```text
![title](http://localhost:9090/plantuml/svg/<encoded> "title")
```

You can extract the URL and open it:

```powershell
$md = .\test-scripts\generate.ps1 "open-me" "User logs in. Token is issued."

if ($md -match '!\[[^\]]*\]\(([^ ]+)') {
  $url = $Matches[1]
  Start-Process $url
} else {
  throw "Could not parse URL from markdown: $md"
}
```

### Example 7: save the markdown to a file

```powershell
.\test-scripts\generate.ps1 "login-sequence" "User logs in. Auth service validates and returns JWT." | Out-File -Encoding utf8 .\diagram.md
```

---

## Bash examples (macOS/Linux/WSL/Git Bash)

Run these from the repo root.

### Example 1: recommended wrapper (defaults)

```bash
./test-scripts/generate.sh
```

### Example 2: custom title

```bash
./test-scripts/generate.sh "checkout-flow"
```

### Example 3: custom scenario

```bash
./test-scripts/generate.sh "payment-flow" "User adds items to cart. Proceeds to checkout. Payment is processed."
```

### Example 4: use the encode endpoint explicitly

```bash
./test-scripts/generate-encode.sh "api-flow" "Client calls API. API validates request. API returns 200."
```

### Example 5: render using a public PlantUML server

```bash
./test-scripts/generate.sh "public-render" "Client calls API. API validates request." "http://www.plantuml.com/plantuml"
```

### Example 6: open the rendered SVG URL

This extracts the URL from the generated Markdown:

```bash
URL=$(./test-scripts/generate.sh "open-me" "User logs in. Token is issued." | sed -E 's/^!\[[^\]]*\]\(([^ ]+).*/\1/')

# macOS:
# open "$URL"

# Linux:
# xdg-open "$URL"

echo "$URL"
```

---

## Notes / Troubleshooting

- If the generated URL returns `400 Bad Request`, it usually means the request included extra non-PlantUML text.
  - These scripts extract only the `@startuml ... @enduml` block from Copilot output before encoding.
- If you change ports, you likely need to update:
  - The encoder base URL (`http://localhost:9091`)
  - The PlantUML server base URL (`http://localhost:9090/plantuml`)

---

## Next ideas

- Paste the output Markdown into your repo README to keep diagrams "live".
- Use different scenarios to explore alternate architectures and flows.
