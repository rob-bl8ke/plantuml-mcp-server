/**
 * encode.js
 *
 * Calls the local Docker encoder service to encode a PlantUML diagram
 * and return a Markdown image link.
 *
 * The Docker service must be running (docker compose up -d in docker-service/).
 */

// Defaults to the internal Docker service name when running inside docker-compose,
// falls back to localhost for local development without Docker.
const ENCODER_URL = process.env.ENCODER_URL || 'http://encoder:3000';

/**
 * Encode a PlantUML diagram and return a Markdown image link.
 *
 * @param {object} args
 * @param {string} args.plantuml  - Raw PlantUML text (@startuml ... @enduml)
 * @param {string} args.title     - Alt text / title for the image
 * @param {string} args.format    - 'svg' | 'png' | 'txt' (default: 'svg')
 * @param {string} args.base_url  - Public PlantUML server base URL
 * @returns {Promise<{markdown: string, url: string, encoded: string}>}
 */
export async function encodePlantuml({ plantuml, title = 'diagram', format = 'svg', base_url }) {
  const response = await fetch(`${ENCODER_URL}/encode`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: plantuml,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Encoder service returned ${response.status}: ${body}`);
  }

  const { encoded, urls } = await response.json();

  // Prefer the explicitly passed base_url over what the encoder returned,
  // so callers can override the public URL without reconfiguring the Docker service.
  const resolvedBase = base_url
    ? base_url.replace(/\/$/, '')
    : urls[format].replace(/\/(svg|png|txt)\/.*$/, '');

  const url = `${resolvedBase}/${format}/${encoded}`;
  const markdown = `![${title}](${url} "${title}")`;

  return { markdown, url, encoded };
}
