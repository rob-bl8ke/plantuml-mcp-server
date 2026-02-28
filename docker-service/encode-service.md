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
- **PlantUML Server URL**: Uses `process.env.PLANTUML_SERVER` or defaults to `http://plantuml-server:8080/plantuml`.

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
- **Response:** `{ status: 'ok', service: 'plantuml-encoder' }`

---

### 2. Encode

- **Route:** `POST /encode`
- **Purpose:** Encodes PlantUML diagram text and returns the encoded string plus URLs for SVG, PNG, and TXT formats.
- **Request Body:** Plain text or JSON (`{ plantuml: "..." }`).
- **Response:**
  - `encoded`: The encoded PlantUML string.
  - `urls`: Direct links to SVG, PNG, and TXT renderings via the PlantUML server.
- **Error Handling:**
  - 400 if no PlantUML content is provided.
  - 500 if encoding fails (error message comes from Node.js, not PlantUML).
- **Note:** Malformed PlantUML syntax is not detected here; errors only occur if the encoder fails (rare).

---

### 3. Markdown

- **Route:** `POST /markdown`
- **Purpose:** Generates a Markdown image link for a PlantUML diagram.
- **Request Body:** JSON with `plantuml`, optional `title`, and optional `format` (`svg` by default).
- **Response:**
  - `markdown`: Markdown image link.
  - `url`: Direct link to the diagram.
  - `encoded`: The encoded string.
- **Error Handling:**
  - 400 if no PlantUML content is provided.
  - 500 if encoding fails.

---

### 4. Decode

- **Route:** `POST /decode`
- **Purpose:** Decodes an encoded PlantUML string back to its original diagram text.
- **Request Body:** Plain text or JSON (`{ encoded: "..." }`).
- **Response:**
  - `decoded`: The original PlantUML diagram text.
- **Error Handling:**
  - 400 if no encoded string is provided.
  - 500 if decoding fails.

---

### 5. Root (Usage Info)

- **Route:** `GET /`
- **Purpose:** Provides a summary of the service, endpoints, and example requests.
- **Response:** JSON with service info, endpoint descriptions, and example requests.

---

## TXT Format

- The `/encode` endpoint provides a `txt` URL, which returns an ASCII art representation of the PlantUML diagram (useful for plain text environments).

---

## Server Startup

- The server listens on all interfaces (`0.0.0.0`) at the specified port.
- Startup messages are logged to the console, including the port and PlantUML server URL.
- These logs appear in Docker container logs and can be viewed with `docker logs <container_name>` or `docker-compose logs <service_name>`.

---

## Docker Compose Notes

- Port forwarding and environment variables are typically set in `docker-compose.yml`.
- You do not need to manually set environment variables when using Docker Compose unless you want to override defaults.

---

## Error Handling Summary

- Request body too large: `413 Payload Too Large` (handled by Express).
- Missing or invalid body: `400 Bad Request` with usage info.
- Internal encoding/decoding errors: `500 Internal Server Error` with error message.
- Malformed PlantUML syntax is not detected by the encoder; errors only occur at rendering time on the PlantUML server.

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
