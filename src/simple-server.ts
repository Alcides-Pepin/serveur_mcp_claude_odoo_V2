import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Simple MCP Server'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Simple MCP Server',
    version: '1.0.0',
    description: 'Basic Model Context Protocol server for testing connectivity',
    endpoints: {
      health: '/health',
      mcp: '/mcp'
    }
  });
});

// Basic MCP endpoints (no auth required)
app.get('/mcp', (req, res) => {
  res.json({
    protocol_version: "2024-11-05",
    capabilities: {
      tools: {},
      resources: {}
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
        name: "echo",
        description: "Echo back the provided message",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The message to echo back"
            }
          },
          required: ["message"]
        }
      },
      {
        name: "ping",
        description: "Simple ping tool that returns pong",
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
  const { name, arguments: args } = req.body;

  try {
    switch (name) {
      case 'echo':
        if (!args?.message) {
          throw new Error('Message parameter is required');
        }
        res.json({
          content: [
            {
              type: "text",
              text: `Echo: ${args.message}`
            }
          ]
        });
        break;

      case 'ping':
        res.json({
          content: [
            {
              type: "text",
              text: "pong"
            }
          ]
        });
        break;

      default:
        res.status(404).json({
          error: 'tool_not_found',
          message: `Tool '${name}' not found`
        });
    }
  } catch (error: any) {
    res.status(400).json({
      error: 'tool_execution_failed',
      message: error.message
    });
  }
});

// List available resources
app.post('/mcp/resources/list', (req, res) => {
  res.json({
    resources: [
      {
        uri: "info://server",
        name: "Server Information",
        description: "Basic server information",
        mimeType: "application/json"
      }
    ]
  });
});

// Read a resource
app.post('/mcp/resources/read', (req, res) => {
  const { uri } = req.body;

  switch (uri) {
    case 'info://server':
      res.json({
        contents: [
          {
            uri: "info://server",
            mimeType: "application/json",
            text: JSON.stringify({
              name: "Simple MCP Server",
              version: "1.0.0",
              uptime: process.uptime(),
              timestamp: new Date().toISOString(),
              node_version: process.version
            }, null, 2)
          }
        ]
      });
      break;

    default:
      res.status(404).json({
        error: 'resource_not_found',
        message: `Resource '${uri}' not found`
      });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple MCP Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`⚡ MCP endpoint: http://localhost:${PORT}/mcp`);
});

export default app;