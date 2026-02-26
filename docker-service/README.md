
# PlantUML Docker Service (How-To)

This folder contains two containers:

- **PlantUML Server** (renders diagrams): exposed on `http://localhost:9090/plantuml`
- **Encoder Service** (turns PlantUML text into an encoded URL): exposed on `http://localhost:9091`

The workflow is:

1. POST your PlantUML script to the encoder (`/encode`).
2. Use the returned `urls.svg` value as a browser URL (it will render an SVG).

## Endpoints

- Encoder health: `GET http://localhost:9091/health`
- Encode (recommended): `POST http://localhost:9091/encode` with `Content-Type: text/plain`
	- Body: raw PlantUML text (`@startuml ... @enduml`)
	- Response JSON includes `encoded` and `urls.svg` / `urls.png` / `urls.txt`
- PlantUML render URL format:
	- `http://localhost:9090/plantuml/svg/<encoded>`

If you changed ports in Compose, replace `9090`/`9091` accordingly.

## Start / Stop (Docker Compose)

From this folder ([docker-service](docker-service)):

### Start

```sh
docker compose up -d
```

First run (or after changes), you may want:

```sh
docker compose up -d --build
```

Note: older Docker installs use `docker-compose` instead of `docker compose`.

### Check status

```sh
docker compose ps
```

Optional health checks:

```sh
curl -sS http://localhost:9091/health
curl -sS -I http://localhost:9090/plantuml/
```

### View logs

```sh
docker compose logs -f
```

### Stop

```sh
docker compose down
```

## Example PlantUML

```text
@startuml
Alice -> Bob: Hello
@enduml
```

## Windows (PowerShell)

### 1) Encode and print the SVG URL

```powershell
$plantuml = @"
@startuml
Alice -> Bob: Hello
@enduml
"@

$resp = Invoke-RestMethod `
	-Uri "http://localhost:9091/encode" `
	-Method Post `
	-ContentType "text/plain" `
	-Body $plantuml

$resp.urls.svg
```

### 2) Encode and open the SVG in your default browser

```powershell
$plantuml = @"
@startuml
Alice -> Bob: Hello
@enduml
"@

$resp = Invoke-RestMethod -Uri "http://localhost:9091/encode" -Method Post -ContentType "text/plain" -Body $plantuml
Start-Process $resp.urls.svg
```

### Alternative: `curl.exe` (PowerShell-safe multiline)

```powershell
@'
@startuml
Alice -> Bob: Hello
@enduml
'@ | curl.exe -s -X POST http://localhost:9091/encode `
			-H "Content-Type: text/plain" `
			--data-binary '@-'
```

Copy the `urls.svg` value from the JSON and paste it into your browser.

## macOS (zsh)

### 1) Encode and print the SVG URL

```sh
PUML='@startuml
Alice -> Bob: Hello
@enduml'

curl -sS -X POST "http://localhost:9091/encode" \
	-H "Content-Type: text/plain" \
	--data-binary "$PUML"
```

### 2) Encode and open the SVG in your default browser

This uses `python3` only to read the JSON and extract `urls.svg`.

```sh
PUML='@startuml
Alice -> Bob: Hello
@enduml'

SVG_URL=$(curl -sS -X POST "http://localhost:9091/encode" \
	-H "Content-Type: text/plain" \
	--data-binary "$PUML" \
	| python3 -c 'import sys, json; print(json.load(sys.stdin)["urls"]["svg"])')

open "$SVG_URL"
```

## Linux (bash)

### 1) Encode and print the SVG URL

```sh
PUML='@startuml
Alice -> Bob: Hello
@enduml'

curl -sS -X POST "http://localhost:9091/encode" \
	-H "Content-Type: text/plain" \
	--data-binary "$PUML"
```

### 2) Encode and open the SVG (desktop environments)

This uses `python3` only to read the JSON and extract `urls.svg`.

```sh
PUML='@startuml
Alice -> Bob: Hello
@enduml'

SVG_URL=$(curl -sS -X POST "http://localhost:9091/encode" \
	-H "Content-Type: text/plain" \
	--data-binary "$PUML" \
	| python3 -c 'import sys, json; print(json.load(sys.stdin)["urls"]["svg"])')

xdg-open "$SVG_URL"
```

## Additional API examples (native CLI)

These examples are useful when you want more control over how you send content (heredoc, file input, etc.).

### GET / (service info)

```sh
curl -sS http://localhost:9091/
```

### POST /encode (more ways to send PlantUML)

#### macOS/Linux: heredoc (best for multi-line)

```sh
curl -sS -X POST http://localhost:9091/encode \
	-H "Content-Type: text/plain" \
	--data-binary @- << 'EOF'
@startuml
Alice -> Bob: Hello
Bob -> Alice: Response
@enduml
EOF
```

#### macOS/Linux: from a file

```sh
cat my-diagram.puml | curl -sS -X POST http://localhost:9091/encode \
	-H "Content-Type: text/plain" \
	--data-binary @-
```

#### macOS/Linux: one-liner with escaped newlines

```sh
curl -sS -X POST http://localhost:9091/encode \
	-H "Content-Type: text/plain" \
	--data-binary $'@startuml\nAlice -> Bob: Hello\n@enduml'
```

#### Windows (PowerShell): from a file

```powershell
Get-Content -Raw .\my-diagram.puml |
	curl.exe -s -X POST http://localhost:9091/encode `
		-H "Content-Type: text/plain" `
		--data-binary '@-'
```

### Extract just the encoded string

If you have `jq` installed:

```sh
curl -sS -X POST http://localhost:9091/encode \
	-H "Content-Type: text/plain" \
	--data-binary $'@startuml\nAlice -> Bob: Hello\n@enduml' \
| jq -r '.encoded'
```

Or with `python3` (no jq needed):

```sh
curl -sS -X POST http://localhost:9091/encode \
	-H "Content-Type: text/plain" \
	--data-binary $'@startuml\nAlice -> Bob: Hello\n@enduml' \
| python3 -c 'import sys, json; print(json.load(sys.stdin)["encoded"])'
```

### POST /markdown

Returns a ready-to-paste Markdown image link.

#### macOS/Linux: JSON body

```sh
curl -sS -X POST http://localhost:9091/markdown \
	-H "Content-Type: application/json" \
	-d '{
		"plantuml": "@startuml\\nAlice -> Bob: Hello\\n@enduml",
		"title": "my-diagram",
		"format": "svg"
	}'
```

#### macOS/Linux: text/plain heredoc

```sh
curl -sS -X POST http://localhost:9091/markdown \
	-H "Content-Type: text/plain" \
	--data-binary @- << 'EOF'
@startuml
Alice -> Bob: Hello
@enduml
EOF
```

### POST /decode

Useful for debugging an encoded string.

#### Text/plain

```sh
curl -sS -X POST http://localhost:9091/decode \
	-H "Content-Type: text/plain" \
	--data-binary "SoWkIImgAStDuNBCoKnELT2rKt3AJx9Iy4ZDoSddSaZDIodDpU7b0W00"
```

#### JSON

```sh
curl -sS -X POST http://localhost:9091/decode \
	-H "Content-Type: application/json" \
	-d '{"encoded":"SoWkIImgAStDuNBCoKnELT2rKt3AJx9Iy4ZDoSddSaZDIodDpU7b0W00"}'
```

## Troubleshooting

- If `http://localhost:9090/` returns a 404, that is expected; the server is mounted at `/plantuml`.
- If the encoder returns URLs like `http://localhost:8080/svg/...` that *don’t* open in your browser, update the encoder’s `PLANTUML_SERVER` env to the host-accessible base:
	- `http://localhost:9090/plantuml`

## Encoder API summary

- `POST /encode`
	- Request: `text/plain` body (or JSON `{ "plantuml": "..." }`)
	- Response: `{ encoded, urls: { svg, png, txt } }`
- `POST /markdown`
	- Request JSON: `{ plantuml, title, format }`
	- Response: `{ markdown, url, encoded }`
