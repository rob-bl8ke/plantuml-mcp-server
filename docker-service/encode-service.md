# encode-service.js Overview

This document explains the structure and functionality of the `encode-service.js` file, which provides a PlantUML encoding service using Node.js and Express.

---

## Imports

- **express**: Web framework for building APIs and servers.
- **body-parser**: Middleware for parsing incoming request bodies (JSON and plain text).
- **plantuml-encoder**: Library for encoding/decoding PlantUML diagrams to/from the format used by PlantUML servers.

---

## Main Flow

- **Express App**: `const app = express();`
- **Port**: Uses `process.env.PORT` or defaults to `3000`.
- **PlantUML Internal URL**: Uses `process.env.PLANTUML_INTERNAL` or defaults to `http://plantuml-server:8080/plantuml`. Used for container-to-container communication (not exposed to callers).
- **PlantUML Public URL**: Uses `process.env.PLANTUML_PUBLIC` or defaults to `http://localhost:9090/plantuml`. Embedded in all URLs returned to callers — must be resolvable from the client machine.

---

## Middleware

- Accepts both plain text and JSON request bodies.
- Sets a 10MB limit for plain text requests.
- If a request body exceeds 10MB, the client receives a `413 Payload Too Large` error.

---

## Endpoints

### 1. Health Check

- **Route:** `GET /health`
- **Purpose:** Verifies service is running.
- **Response:** `{ status, service, version, plantumlInternal, plantumlPublic }`

---

### 2. Diagram Types

- **Route:** `GET /diagram-types`
- **Purpose:** Returns the list of supported diagram types and output formats. Useful for MCP tool discoverability.
- **Response:** `{ types: [...], formats: ['svg', 'png', 'txt'] }`

---

### 3. Encode

- **Route:** `POST /encode`
- **Purpose:** Encodes PlantUML diagram text and returns the encoded string plus URLs for SVG, PNG, and TXT formats.
- **Request Body:** Plain text or JSON (`{ plantuml: "..." }`).
- **Response:**
  - `encoded`: The encoded PlantUML string.
  - `urls`: Direct links to SVG, PNG, and TXT renderings via the PlantUML server.
- **Error Handling:**
  - 400 if no PlantUML content is provided.
  - 400 if content does not start with `@startuml` or end with `@enduml` (validated by `validatePlantuml()`).
  - 500 if encoding fails.

---

### 4. Markdown

- **Route:** `POST /markdown`
- **Purpose:** Generates a Markdown image link for a PlantUML diagram.
- **Request Body:** Plain text or JSON with `plantuml`, optional `title`, and optional `format` (`svg` by default).
- **Response:**
  - `markdown`: Markdown image link.
  - `url`: Direct link to the diagram.
  - `encoded`: The encoded string.
- **Error Handling:**
  - 400 if no PlantUML content is provided.
  - 400 if content does not start with `@startuml` or end with `@enduml`.
  - 500 if encoding fails.

---

### 5. Decode

- **Route:** `POST /decode`
- **Purpose:** Decodes an encoded PlantUML string back to its original diagram text.
- **Request Body:** Plain text or JSON (`{ encoded: "..." }`).
- **Response:**
  - `decoded`: The original PlantUML diagram text.
- **Error Handling:**
  - 400 if no encoded string is provided.
  - 500 if decoding fails.

---

### 6. Root (Usage Info)

- **Route:** `GET /`
- **Purpose:** Provides a summary of the service, endpoints, and example requests.
- **Response:** JSON with service info, endpoint descriptions, and example requests.

---

## TXT Format

- The `/encode` endpoint provides a `txt` URL, which returns an ASCII art representation of the PlantUML diagram (useful for plain text environments).

---

## Server Startup

- The server listens on all interfaces (`0.0.0.0`) at the specified port.
- Startup messages are logged to the console, including the port, `PLANTUML_INTERNAL`, and `PLANTUML_PUBLIC` URLs.
- These logs appear in Docker container logs and can be viewed with `docker logs <container_name>` or `docker-compose logs <service_name>`.

---

## Docker Compose Notes

- Port forwarding and environment variables are set in `docker-compose.yml`.
- `PLANTUML_INTERNAL` is used by Node.js inside the Docker network (container-to-container). Leave this as the service name `plantuml-server`.
- `PLANTUML_PUBLIC` is embedded in URLs returned to callers. Set this to the externally accessible host/port (default: `http://localhost:9090/plantuml`).
- You do not need to manually set environment variables when using Docker Compose unless you want to override defaults.

---

## Error Handling Summary

- Request body too large: `413 Payload Too Large` (handled by Express).
- Missing or invalid body: `400 Bad Request` with usage info.
- Content missing `@startuml`/`@enduml` boundaries: `400 Bad Request` with specific reason string.
- Internal encoding/decoding errors: `500 Internal Server Error` with error message.
- Malformed PlantUML syntax within a valid `@startuml`/`@enduml` block is not detected by the encoder; errors surface at rendering time on the PlantUML server.

---

## Example Requests

### Encode
```http
POST /encode
Content-Type: text/plain

@startuml
Alice -> Bob: Hello
@enduml
```

### Markdown
```http
POST /markdown
Content-Type: application/json

{
  "plantuml": "@startuml\nAlice -> Bob: Hello\n@enduml",
  "title": "my-diagram",
  "format": "svg"
}
```

### Decode
```http
POST /decode
Content-Type: application/json

{
  "encoded": "SoWkIImgAStDuKhEIImkLaZ8pSd91m00"
}
```

---

## Service Summary

- Encodes, decodes, and generates Markdown for PlantUML diagrams.
- Provides direct URLs for rendering diagrams in multiple formats.
- Designed for use in Dockerized environments and easy integration with other services.
