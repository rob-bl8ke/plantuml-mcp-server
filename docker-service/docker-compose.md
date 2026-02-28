# docker-compose.yml Overview

This document explains the structure and functionality of the `docker-compose.yml` file for the PlantUML encoding and rendering services.

---

## Main Structure

Defines two services:
- **plantuml-server**: PlantUML rendering server
- **encoder**: PlantUML encoding API service

Both services are orchestrated together for easy management and communication.

---

## plantuml-server Service

- **image**: Uses the official PlantUML server Docker image (`plantuml/plantuml-server:latest`).
- **container_name**: Names the container `plantuml-server`.
- **ports**: Maps port 8080 in the container to port 9090 on the host (`"9090:8080"`).
- **environment**: Sets `BASE_URL=plantuml` for the server.
- **healthcheck**:
  - Uses `wget -q --spider http://localhost:8080/` to check if the server is up.
  - Runs every 10 seconds, times out after 5 seconds, and retries 3 times before marking as unhealthy.

---

## encoder Service

- **build**:
  - Builds the image from the local Dockerfile in the current directory.
- **container_name**: Names the container `plantuml-encoder`.
- **ports**: Maps port 3000 in the container to port 9091 on the host (`"9091:3000"`).
- **environment**:
  - Sets `PORT=3000` for the Express server.
  - Sets `PLANTUML_SERVER=http://localhost:9090/plantuml` so it knows where to find the PlantUML server.
- **depends_on**:
  - Ensures the encoder service starts after the plantuml-server.
- **healthcheck**:
  - Uses `wget -q --spider http://localhost:3000/health` to check if the encoder’s health endpoint is up.
  - Same interval, timeout, and retries as above.

---

## Healthcheck Details

- The `wget` command is used to check if the HTTP endpoint of each service is reachable and responding.
- If the command succeeds, the service is considered healthy; if it fails, Docker marks the container as unhealthy.
- This helps Docker Compose monitor and manage service health automatically.

---

## plantuml-server Service Usage

- The `plantuml-server` exposes an HTTP API for rendering PlantUML diagrams.
- You can send HTTP requests with encoded PlantUML data to endpoints like `/svg/{encoded}` or `/png/{encoded}` to get rendered images (SVG, PNG).
- It can also return ASCII art or other formats depending on the endpoint.
- Typically used by the encoder service or other clients to generate diagrams for display, documentation, or integration.

---

## encoder Service Usage

- The encoder service provides an API for encoding PlantUML text, generating Markdown image links, and decoding encoded strings.
- It communicates with the plantuml-server to obtain rendered diagrams.
- Designed for integration with other tools, automation, or web applications.

---

## Docker Compose Notes

- Port forwarding and environment variables are set in this file, so you do not need to manually set them when starting containers.
- Both services are started and managed together, with health checks ensuring reliability.

---

## Example Endpoints

- **plantuml-server**: `http://localhost:9090/plantuml/svg/{encoded}`
- **encoder**: `http://localhost:9091/encode`, `http://localhost:9091/markdown`, `http://localhost:9091/decode`, `http://localhost:9091/health`

---

## Service Summary

- Orchestrates PlantUML rendering and encoding services for automated diagram generation and integration.
- Ensures both services are healthy and available for use.
