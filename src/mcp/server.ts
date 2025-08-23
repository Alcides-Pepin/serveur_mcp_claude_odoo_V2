import { Express } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Basic MCP server setup
export function setupMCPEndpoints(app: Express) {
  // MCP server info endpoint
  app.get('/mcp', (req, res) => {
    res.json({
      protocol_version: "2024-11-05",
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      },
      server_info: {
        name: process.env.MCP_SERVER_NAME || 'MCP Auth0 Server',
        version: process.env.MCP_SERVER_VERSION || '1.0.0'
      },
      user: {
        id: req.user?.sub,
        email: req.user?.email,
        name: req.user?.name
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
          name: "get_user_info",
          description: "Get authenticated user information",
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

        case 'get_user_info':
          res.json({
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  user_id: req.user?.sub,
                  email: req.user?.email,
                  name: req.user?.name,
                  scopes: req.user?.scope?.split(' ') || []
                }, null, 2)
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
          uri: "user://profile",
          name: "User Profile",
          description: "Current authenticated user's profile information",
          mimeType: "application/json"
        }
      ]
    });
  });

  // Read a resource
  app.post('/mcp/resources/read', (req, res) => {
    const { uri } = req.body;

    switch (uri) {
      case 'user://profile':
        res.json({
          contents: [
            {
              uri: "user://profile",
              mimeType: "application/json",
              text: JSON.stringify({
                id: req.user?.sub,
                email: req.user?.email,
                name: req.user?.name,
                picture: req.user?.picture,
                scopes: req.user?.scope?.split(' ') || [],
                last_login: new Date().toISOString()
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
}