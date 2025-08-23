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
      call: '/mcp/tools/call',
      oauth_discovery: '/.well-known/oauth-authorization-server'
    }
  });
});

// OAuth Authorization Server Discovery (requis par Claude)
app.get('/.well-known/oauth-authorization-server', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  res.json({
    issuer: `https://${process.env.AUTH0_DOMAIN}`,
    authorization_endpoint: `https://${process.env.AUTH0_DOMAIN}/authorize`,
    token_endpoint: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
    device_authorization_endpoint: `https://${process.env.AUTH0_DOMAIN}/oauth/device/code`,
    userinfo_endpoint: `https://${process.env.AUTH0_DOMAIN}/userinfo`,
    jwks_uri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    scopes_supported: ["openid", "profile", "email"],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: [
      "authorization_code",
      "urn:ietf:params:oauth:grant-type:device_code"
    ],
    code_challenge_methods_supported: ["S256"]
  });
});

// OAuth Protected Resource Discovery
app.get('/.well-known/oauth-protected-resource', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  res.json({
    resource: baseUrl,
    authorization_servers: [`https://${process.env.AUTH0_DOMAIN}`],
    scopes_supported: ["openid", "profile", "email"],
    bearer_methods_supported: ["header"]
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