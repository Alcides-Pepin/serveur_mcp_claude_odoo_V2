const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    name: 'Simple MCP Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      mcp_info: '/mcp',
      tools: '/mcp/tools/list',
      call: '/mcp/tools/call'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// MCP server info
app.get('/mcp', (req, res) => {
  res.json({
    protocol_version: "2024-11-05",
    capabilities: {
      tools: {}
    },
    server_info: {
      name: 'Simple MCP Server',
      version: '1.0.0'
    }
  });
});

// List available tools
app.post('/mcp/tools/list', (req, res) => {
  res.json({
    tools: [
      {
        name: "ping",
        description: "Simple ping tool",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      }
    ]
  });
});

// Call a tool
app.post('/mcp/tools/call', (req, res) => {
  const { name } = req.body;
  
  if (name === 'ping') {
    res.json({
      content: [{
        type: "text",
        text: "pong"
      }]
    });
  } else {
    res.status(404).json({
      error: 'tool_not_found',
      message: `Tool '${name}' not found`
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MCP Server running on port ${PORT}`);
});