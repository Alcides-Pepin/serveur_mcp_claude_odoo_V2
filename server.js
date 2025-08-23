const express = require('express');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// JWKS client for Auth0
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Missing authorization header'
    });
  }

  const token = authHeader.substring(7);
  
  jwt.verify(token, getKey, {
    audience: process.env.AUTH0_AUDIENCE || 'https://your-api-audience',
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
  }, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Token verification failed'
      });
    }
    
    req.user = decoded;
    next();
  });
}

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

// Alternative OAuth endpoints que Claude pourrait chercher
app.get('/oauth/config', (req, res) => {
  res.json({
    authorization_endpoint: `https://${process.env.AUTH0_DOMAIN}/authorize`,
    token_endpoint: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
    client_id: process.env.AUTH0_CLIENT_ID
  });
});

app.get('/.well-known/openid_configuration', (req, res) => {
  res.redirect('/.well-known/oauth-authorization-server');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// MCP server info (protected)
app.get('/mcp', authMiddleware, (req, res) => {
  res.json({
    protocol_version: "2024-11-05",
    capabilities: {
      tools: {}
    },
    server_info: {
      name: 'Simple MCP Server',
      version: '1.0.0'
    },
    user: {
      sub: req.user.sub,
      email: req.user.email
    }
  });
});

// List available tools (protected)
app.post('/mcp/tools/list', authMiddleware, (req, res) => {
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

// Call a tool (protected)
app.post('/mcp/tools/call', authMiddleware, (req, res) => {
  const { name } = req.body;
  
  if (name === 'ping') {
    res.json({
      content: [{
        type: "text",
        text: `pong from ${req.user.email || req.user.sub}`
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