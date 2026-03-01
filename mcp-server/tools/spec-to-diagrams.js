/**
 * spec-to-diagrams.js
 *
 * Orchestrates the full pipeline for generating multiple PlantUML diagrams
 * from a plain-English technical specification:
 *
 *   1. Load the prompt template for each requested diagram type
 *   2. Inject the spec into the template ({{SCENARIO}} placeholder)
 *   3. Call the GitHub Models API with the rendered prompt
 *   4. Extract the @startuml...@enduml block from the LLM response
 *   5. Encode the diagram via the local Docker encoder service
 *   6. Return an array of { type, title, markdown, url, encoded }
 *
 * Environment variables:
 *   GITHUB_TOKEN      - Required. Personal access token or Copilot token with
 *                       access to the GitHub Models API.
 *   GITHUB_MODEL      - Model to use (default: gpt-4o-mini)
 *   ENCODER_URL       - Docker encoder service base URL (default: http://localhost:9091)
 *   PLANTUML_BASE_URL - Public PlantUML server URL embedded in returned links
 *                       (default: http://localhost:9090/plantuml)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { encodePlantuml } from './encode.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '..', 'prompts');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_MODEL = process.env.GITHUB_MODEL || 'gpt-4o-mini';
const PLANTUML_BASE_URL = process.env.PLANTUML_BASE_URL || 'http://localhost:9090/plantuml';

// Map of supported diagram types to their prompt template files
const DIAGRAM_PROMPTS = {
  sequence:  'plantuml-sequence.txt',
  class:     'plantuml-class.txt',
  component: 'plantuml-component.txt',
  activity:  'plantuml-activity.txt',
};

/** Timeout in milliseconds for GitHub Models API calls */
const LLM_TIMEOUT_MS = 30_000;

/**
 * Call the GitHub Models API (OpenAI-compatible) to generate PlantUML.
 *
 * @param {string} prompt - The fully rendered prompt (template + scenario)
 * @returns {Promise<string>} Raw LLM response text
 */
async function callLlm(prompt) {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable is required for spec_to_diagrams.');
  }

  console.log(`[spec-to-diagrams] Calling GitHub Models API (model: ${GITHUB_MODEL})...`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  let response;
  try {
    response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        model: GITHUB_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2, // Low temperature: we want deterministic, spec-compliant output
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`GitHub Models API timed out after ${LLM_TIMEOUT_MS / 1000}s. Check network connectivity from the container.`);
    }
    throw new Error(`GitHub Models API request failed: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub Models API returned ${response.status}: ${body}`);
  }

  const data = await response.json();
  console.log(`[spec-to-diagrams] GitHub Models API responded successfully.`);
  return data.choices[0].message.content;
}

/**
 * Extract the @startuml...@enduml block from an LLM response.
 * Returns null if the block cannot be found.
 *
 * @param {string} text - Raw LLM response
 * @returns {string|null}
 */
function extractPlantuml(text) {
  const match = text.match(/@startuml[\s\S]*?@enduml/);
  return match ? match[0].trim() : null;
}

/**
 * Generate multiple PlantUML diagrams from a technical specification.
 *
 * @param {object} args
 * @param {string}   args.spec          - Plain-English technical specification
 * @param {string[]} args.diagrams      - Diagram types to generate (e.g. ['sequence', 'class'])
 * @param {string}   args.title_prefix  - Prefix used for diagram titles (e.g. 'checkout-flow')
 * @param {string}   [args.base_url]    - Override public PlantUML server URL
 * @param {string}   [args.format]      - 'svg' | 'png' (default: 'svg')
 * @returns {Promise<Array<{type: string, title: string, markdown: string, url: string, encoded: string} | {type: string, error: string}>>}
 */
export async function specToDiagrams({ spec, diagrams, title_prefix, base_url, format = 'svg' }) {
  const resolvedBaseUrl = base_url || PLANTUML_BASE_URL;
  const results = [];

  for (const type of diagrams) {
    const templateFile = DIAGRAM_PROMPTS[type];

    if (!templateFile) {
      results.push({ type, error: `Unknown diagram type: "${type}". Supported: ${Object.keys(DIAGRAM_PROMPTS).join(', ')}` });
      continue;
    }

    try {
      // 1. Load and render the prompt template
      const templatePath = join(PROMPTS_DIR, templateFile);
      const template = readFileSync(templatePath, 'utf8');
      const prompt = template.replace('{{SCENARIO}}', spec);

      // 2. Call the LLM
      const rawLlm = await callLlm(prompt);

      // 3. Extract @startuml...@enduml block
      const plantuml = extractPlantuml(rawLlm);
      if (!plantuml) {
        results.push({ type, error: `LLM did not return a valid @startuml..@enduml block. Raw response (first 300 chars): ${rawLlm.substring(0, 300)}` });
        continue;
      }

      // 4. Encode via Docker service and build Markdown link
      const title = `${title_prefix}-${type}`;
      const encoded = await encodePlantuml({ plantuml, title, format, base_url: resolvedBaseUrl });

      results.push({ type, title, ...encoded });
    } catch (err) {
      results.push({ type, error: err.message });
    }
  }

  return results;
}
