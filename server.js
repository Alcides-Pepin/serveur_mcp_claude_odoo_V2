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

// Auth middleware avec logs détaillés
function authMiddleware(req, res, next) {
  console.log('🔐 Auth check for:', req.method, req.url);
  console.log('🔑 Headers:', req.headers.authorization ? 'Bearer token present' : 'No auth header');
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No valid auth header');
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Missing authorization header'
    });
  }

  const token = authHeader.substring(7);
  console.log('🎫 Token received, length:', token.length);
  
  jwt.verify(token, getKey, {
    audience: process.env.AUTH0_AUDIENCE || 'https://your-api-audience',
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
  }, (err, decoded) => {
    if (err) {
      console.log('❌ JWT verification failed:', err.message);
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Token verification failed'
      });
    }
    
    console.log('✅ JWT verified for user:', decoded.sub);
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

// SSE endpoint pour Claude Web - GET (connexion)
app.get('/sse', (req, res) => {
  console.log('🌊 Claude SSE connection established (GET)');
  
  // Headers SSE obligatoires
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Garder la connexion ouverte
  const keepAlive = setInterval(() => {
    res.write('data: {"type":"ping"}\n\n');
  }, 30000);

  req.on('close', () => {
    console.log('🌊 SSE connection closed');
    clearInterval(keepAlive);
  });
});

// SSE endpoint pour Claude Web - POST (messages)
app.post('/sse', (req, res) => {
  console.log('📨 Claude POST /sse detected!', req.body);
  
  const { method, id } = req.body;
  
  if (method === 'initialize') {
    console.log('🔧 SSE Initialize via POST');
    res.json({
      jsonrpc: "2.0",
      id: id,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: {
          logging: {},
          prompts: { listChanged: true },
          resources: { subscribe: true, listChanged: true },
          tools: { listChanged: true }
        },
        serverInfo: {
          name: 'Odoo MCP Server',
          version: '1.0.0'
        },
        instructions: "This MCP server provides tools for Odoo integration."
      }
    });
  } else if (method === 'notifications/initialized') {
    console.log('🎯 SSE Notification initialized');
    res.status(200).end();
  } else if (method === 'tools/list') {
    console.log('🛠️ SSE Tools list - FINALLY!');
    res.json({
      jsonrpc: "2.0",
      id: id,
      result: {
        tools: [
          {
            name: "ping",
            title: "Ping Tool",
            description: "Simple ping tool that responds with pong",
            inputSchema: { type: "object", properties: {}, required: [] }
          },
          {
            name: "echo",
            title: "Echo Tool", 
            description: "Echo back your message",
            inputSchema: {
              type: "object",
              properties: { message: { type: "string", description: "Message to echo back" } },
              required: ["message"]
            }
          },
          {
            name: "odoo_query",
            title: "Odoo Query Tool",
            description: "Execute queries on Odoo system",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query to execute" },
                model: { type: "string", description: "Odoo model name (optional)" }
              },
              required: ["query"]
            }
          }
        ]
      }
    });
  } else if (method === 'tools/call') {
    console.log('🎯 SSE Tool call:', req.body.params?.name);
    const { name, arguments: args } = req.body.params;
    
    if (name === 'ping') {
      res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
          content: [{ type: "text", text: "🏓 pong! Your Odoo MCP server is working via SSE!" }]
        }
      });
    } else if (name === 'echo') {
      res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
          content: [{ type: "text", text: `Echo via SSE: ${args?.message || 'No message'}` }]
        }
      });
    } else if (name === 'odoo_query') {
      res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
          content: [{ type: "text", text: `Odoo Query via SSE: "${args?.query}" on model "${args?.model || 'default'}"` }]
        }
      });
    } else {
      res.json({
        jsonrpc: "2.0",
        id: id,
        error: { code: -32601, message: `Method not found: ${name}` }
      });
    }
  } else {
    res.json({
      jsonrpc: "2.0",
      id: id,
      error: { code: -32601, message: `Method not found: ${method}` }
    });
  }
});

// Messages endpoint pour SSE
app.post('/messages', (req, res) => {
  console.log('📨 SSE Message received:', req.body);
  
  const { method, id } = req.body;
  
  // Même logique que le JSON-RPC mais format SSE
  if (method === 'initialize') {
    console.log('🔧 SSE Initialize');
    const response = {
      jsonrpc: "2.0",
      id: id,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: {
          logging: {},
          prompts: { listChanged: true },
          resources: { subscribe: true, listChanged: true },
          tools: { listChanged: true }
        },
        serverInfo: {
          name: 'Odoo MCP Server',
          version: '1.0.0'
        },
        instructions: "This MCP server provides tools for Odoo integration."
      }
    };
    res.json(response);
  } else if (method === 'tools/list') {
    console.log('🛠️ SSE Tools list');
    const response = {
      jsonrpc: "2.0",
      id: id,
      result: {
        tools: [
          {
            name: "ping",
            title: "Ping Tool",
            description: "Simple ping tool that responds with pong",
            inputSchema: { type: "object", properties: {}, required: [] }
          },
          {
            name: "echo",
            title: "Echo Tool",
            description: "Echo back your message",
            inputSchema: {
              type: "object",
              properties: { message: { type: "string", description: "Message to echo back" } },
              required: ["message"]
            }
          },
          {
            name: "odoo_query",
            title: "Odoo Query Tool",
            description: "Execute queries on Odoo system",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Query to execute" },
                model: { type: "string", description: "Odoo model name (optional)" }
              },
              required: ["query"]
            }
          }
        ]
      }
    };
    res.json(response);
  } else {
    res.status(404).json({ error: 'Method not found' });
  }
});

// Claude fait un POST sur / - support JSON-RPC
app.post('/', (req, res) => {
  console.log('🎯 Claude POST / detected!', req.body);
  console.log('🔑 Headers:', req.headers.authorization ? 'Bearer token present' : 'No auth header');
  
  const { method, id } = req.body;
  
  if (method === 'initialize') {
    // Réponse JSON-RPC pour initialize - SPECS MCP 2025-03-26 OFFICIELLES
    console.log('🔧 Claude demande version:', req.body.params.protocolVersion);
    
    // Réponse EXACTE selon specs MCP 2025-03-26
    res.json({
      jsonrpc: "2.0",
      id: id,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: {
          logging: {},
          prompts: {
            listChanged: true
          },
          resources: {
            subscribe: true,
            listChanged: true
          },
          tools: {
            listChanged: true
          }
        },
        serverInfo: {
          name: 'Odoo MCP Server',
          version: '1.0.0'
        },
        instructions: "This MCP server provides tools for Odoo integration."
      }
    });
  } else if (method === 'notifications/initialized') {
    // Notification initialized - conforme aux specs
    console.log('🎯 Notification initialized reçue - serveur prêt');
    res.status(200).end();
  } else if (method === 'tools/list') {
    // Liste des outils disponibles - SPECS MCP 2025-03-26
    console.log('🔧 Claude demande tools/list !');
    res.json({
      jsonrpc: "2.0",
      id: id,
      result: {
        tools: [
          {
            name: "ping",
            title: "Ping Tool",
            description: "Simple ping tool that responds with pong",
            inputSchema: {
              type: "object",
              properties: {},
              required: []
            }
          },
          {
            name: "echo",
            title: "Echo Tool",
            description: "Echo back your message",
            inputSchema: {
              type: "object", 
              properties: {
                message: {
                  type: "string",
                  description: "Message to echo back"
                }
              },
              required: ["message"]
            }
          },
          {
            name: "odoo_query",
            title: "Odoo Query Tool",
            description: "Execute queries on Odoo system",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Query to execute"
                },
                model: {
                  type: "string",
                  description: "Odoo model name (optional)"
                }
              },
              required: ["query"]
            }
          }
        ]
      }
    });
  } else if (method === 'tools/call') {
    // Exécution d'un outil - SPECS MCP 2025-03-26
    const { name, arguments: args } = req.body.params;
    console.log(`🛠️ Tool call: ${name}`, args);
    
    if (name === 'ping') {
      res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
          content: [{
            type: "text", 
            text: "🏓 pong! Your Odoo MCP server is working perfectly!"
          }]
        }
      });
    } else if (name === 'echo') {
      if (!args?.message) {
        return res.json({
          jsonrpc: "2.0",
          id: id,
          error: {
            code: -32602,
            message: "Invalid params: message is required"
          }
        });
      }
      
      res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
          content: [{
            type: "text",
            text: `Echo: ${args.message}`
          }]
        }
      });
    } else if (name === 'odoo_query') {
      if (!args?.query) {
        return res.json({
          jsonrpc: "2.0",
          id: id,
          error: {
            code: -32602,
            message: "Invalid params: query is required"
          }
        });
      }
      
      // Pour l'instant, simulation - plus tard on ajoutera la vraie logique Odoo
      res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
          content: [{
            type: "text",
            text: `Odoo Query executed: "${args.query}" on model "${args.model || 'default'}"\n\nResult: [Simulated response - to be implemented with real Odoo connection]`
          }]
        }
      });
    } else {
      res.json({
        jsonrpc: "2.0",
        id: id,
        error: {
          code: -32601,
          message: `Method not found: ${name}`
        }
      });
    }
  } else {
    // Méthode non supportée
    res.json({
      jsonrpc: "2.0", 
      id: id,
      error: {
        code: -32601,
        message: "Method not found"
      }
    });
  }
});

// OAuth Authorization Server Discovery - Retourner les infos Auth0
app.get('/.well-known/oauth-authorization-server', (req, res) => {
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
    grant_types_supported: ["authorization_code"],
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

// Ajouter un endpoint /authorize qui redirige vers Auth0 au cas où Claude l'appelle
app.get('/authorize', (req, res) => {
  console.log('🔥 Claude essaie /authorize, redirection vers Auth0');
  const authUrl = `https://${process.env.AUTH0_DOMAIN}/authorize?${new URLSearchParams(req.query)}`;
  res.redirect(authUrl);
});

app.get('/oauth/authorize', (req, res) => {
  console.log('🔥 Claude essaie /oauth/authorize, redirection vers Auth0');
  const authUrl = `https://${process.env.AUTH0_DOMAIN}/authorize?${new URLSearchParams(req.query)}`;
  res.redirect(authUrl);
});

// Endpoint de debug
app.get('/debug', (req, res) => {
  res.json({
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// MCP server info (non-protégé pour validation Claude)
app.get('/mcp', (req, res) => {
  console.log('📋 MCP info requested by:', req.headers['user-agent'] || 'Unknown');
  console.log('🔑 Has auth header:', !!req.headers.authorization);
  
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

// MCP server info with user (protected)
app.get('/mcp/user', authMiddleware, (req, res) => {
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