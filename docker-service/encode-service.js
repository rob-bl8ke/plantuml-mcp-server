const express = require('express');
const bodyParser = require('body-parser');
const plantumlEncoder = require('plantuml-encoder');

const app = express();
const PORT = process.env.PORT || 3000;
// Used by Node.js for container-to-container calls (not currently used for direct proxying,
// but available for future health probing or validation against the rendering server)
const PLANTUML_INTERNAL = process.env.PLANTUML_INTERNAL || 'http://plantuml-server:8080/plantuml';
// Embedded in URLs returned to callers — must be resolvable from the client's machine
const PLANTUML_PUBLIC = process.env.PLANTUML_PUBLIC || 'http://localhost:9090/plantuml';

// Validate that the input looks like a PlantUML diagram
function validatePlantuml(input) {
  if (!input || typeof input !== 'string') {
    return { valid: false, reason: 'Input must be a non-empty string' };
  }
  const trimmed = input.trim();
  if (!trimmed.startsWith('@startuml')) {
    return { valid: false, reason: 'Content must start with @startuml' };
  }
  if (!trimmed.endsWith('@enduml')) {
    return { valid: false, reason: 'Content must end with @enduml' };
  }
  return { valid: true };
}

// Middleware
app.use(bodyParser.text({ type: 'text/plain', limit: '10mb' }));
app.use(bodyParser.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'plantuml-encoder',
    version: '1.1.0',
    plantumlInternal: PLANTUML_INTERNAL,
    plantumlPublic: PLANTUML_PUBLIC
  });
});

// Diagram types — useful for MCP tool discoverability
app.get('/diagram-types', (req, res) => {
  res.json({
    types: ['sequence', 'class', 'component', 'activity', 'state', 'usecase', 'deployment', 'er', 'mindmap', 'gantt'],
    formats: ['svg', 'png', 'txt']
  });
});

// Encode endpoint - returns the encoded string only
app.post('/encode', (req, res) => {
  try {
    const plantuml = typeof req.body === 'string' ? req.body : req.body.plantuml;
    
    if (!plantuml) {
      return res.status(400).json({ 
        error: 'No PlantUML content provided',
        usage: 'POST text/plain content or JSON: {"plantuml": "..."}'
      });
    }

    const check = validatePlantuml(plantuml);
    if (!check.valid) {
      return res.status(400).json({ error: check.reason });
    }

    const encoded = plantumlEncoder.encode(plantuml);
    res.json({ 
      encoded,
      urls: {
        svg: `${PLANTUML_PUBLIC}/svg/${encoded}`,
        png: `${PLANTUML_PUBLIC}/png/${encoded}`,
        txt: `${PLANTUML_PUBLIC}/txt/${encoded}`
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Encoding failed', 
      message: error.message 
    });
  }
});

// Encode and return full markdown link
app.post('/markdown', (req, res) => {
  try {
    const plantuml = typeof req.body === 'string' ? req.body : req.body.plantuml;
    const title = typeof req.body === 'object' ? (req.body.title || 'diagram') : 'diagram';
    const format = typeof req.body === 'object' ? (req.body.format || 'svg') : 'svg';
    
    if (!plantuml) {
      return res.status(400).json({ 
        error: 'No PlantUML content provided' 
      });
    }

    const check = validatePlantuml(plantuml);
    if (!check.valid) {
      return res.status(400).json({ error: check.reason });
    }

    const encoded = plantumlEncoder.encode(plantuml);
    const url = `${PLANTUML_PUBLIC}/${format}/${encoded}`;
    const markdown = `![${title}](${url} "${title}")`;
    
    res.json({ 
      markdown,
      url,
      encoded
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Encoding failed', 
      message: error.message 
    });
  }
});

// Decode endpoint - for debugging
app.post('/decode', (req, res) => {
  try {
    const encoded = typeof req.body === 'string' ? req.body : req.body.encoded;
    
    if (!encoded) {
      return res.status(400).json({ 
        error: 'No encoded string provided' 
      });
    }

    const decoded = plantumlEncoder.decode(encoded);
    res.json({ decoded });
  } catch (error) {
    res.status(500).json({ 
      error: 'Decoding failed', 
      message: error.message 
    });
  }
});

// Root endpoint with usage info
app.get('/', (req, res) => {
  res.json({
    service: 'PlantUML Encoder Service',
    version: '1.1.0',
    endpoints: {
      'POST /encode': 'Encode PlantUML text and get URLs',
      'POST /markdown': 'Get markdown image link',
      'POST /decode': 'Decode an encoded string',
      'GET /health': 'Health check',
      'GET /diagram-types': 'List supported diagram types and formats'
    },
    examples: {
      encode: {
        method: 'POST',
        endpoint: '/encode',
        body: '@startuml\\nAlice -> Bob: Hello\\n@enduml',
        contentType: 'text/plain'
      },
      markdown: {
        method: 'POST',
        endpoint: '/markdown',
        body: {
          plantuml: '@startuml\\nAlice -> Bob: Hello\\n@enduml',
          title: 'my-diagram',
          format: 'svg'
        },
        contentType: 'application/json'
      }
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PlantUML Encoder Service running on port ${PORT}`);
  console.log(`PlantUML Internal: ${PLANTUML_INTERNAL}`);
  console.log(`PlantUML Public:   ${PLANTUML_PUBLIC}`);
});
