const express = require('express');
const bodyParser = require('body-parser');
const plantumlEncoder = require('plantuml-encoder');

const app = express();
const PORT = process.env.PORT || 3000;
const PLANTUML_SERVER = process.env.PLANTUML_SERVER || 'http://plantuml-server:8080/plantuml';

// Middleware
app.use(bodyParser.text({ type: 'text/plain', limit: '10mb' }));
app.use(bodyParser.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'plantuml-encoder' });
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

    const encoded = plantumlEncoder.encode(plantuml);
    res.json({ 
      encoded,
      urls: {
        svg: `${PLANTUML_SERVER}/svg/${encoded}`,
        png: `${PLANTUML_SERVER}/png/${encoded}`,
        txt: `${PLANTUML_SERVER}/txt/${encoded}`
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
    const title = req.body.title || 'diagram';
    const format = req.body.format || 'svg';
    
    if (!plantuml) {
      return res.status(400).json({ 
        error: 'No PlantUML content provided' 
      });
    }

    const encoded = plantumlEncoder.encode(plantuml);
    const url = `${PLANTUML_SERVER}/${format}/${encoded}`;
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
    version: '1.0.0',
    endpoints: {
      'POST /encode': 'Encode PlantUML text and get URLs',
      'POST /markdown': 'Get markdown image link',
      'POST /decode': 'Decode an encoded string',
      'GET /health': 'Health check'
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
  console.log(`PlantUML Server: ${PLANTUML_SERVER}`);
});
