#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

dotenv.config();

// Schemas pour les outils
const pingSchema = z.object({});

const echoSchema = z.object({
  message: z.string().describe("Message to echo back"),
});

const odooQuerySchema = z.object({
  query: z.string().describe("Odoo query to execute"),
  model: z.string().optional().describe("Odoo model to query"),
});

// JWKS client pour Auth0 (même logique que l'ancien serveur)
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// Fonction pour vérifier le JWT (optionnelle pour l'instant)
async function verifyToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      audience: process.env.AUTH0_AUDIENCE || 'https://your-api-audience',
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}

class OdooMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "odoo-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "ping",
          description: "Simple ping tool that responds with pong",
          inputSchema: zodToJsonSchema(pingSchema),
        },
        {
          name: "echo",
          description: "Echo back your message",
          inputSchema: zodToJsonSchema(echoSchema),
        },
        {
          name: "odoo_query",
          description: "Execute a query on Odoo system",
          inputSchema: zodToJsonSchema(odooQuerySchema),
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "ping":
            return {
              content: [
                {
                  type: "text",
                  text: "🏓 pong! Your Odoo MCP server is working perfectly!",
                },
              ],
            };

          case "echo": {
            const parsed = echoSchema.safeParse(args);
            if (!parsed.success) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid arguments: ${parsed.error}`
              );
            }

            return {
              content: [
                {
                  type: "text",
                  text: `Echo: ${parsed.data.message}`,
                },
              ],
            };
          }

          case "odoo_query": {
            const parsed = odooQuerySchema.safeParse(args);
            if (!parsed.success) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid arguments: ${parsed.error}`
              );
            }

            // Pour l'instant, on retourne un message de test
            // Plus tard on pourra implémenter la vraie connexion Odoo
            return {
              content: [
                {
                  type: "text",
                  text: `Odoo Query Result: Would execute "${parsed.data.query}" on model "${parsed.data.model || 'default'}"`,
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error}`
        );
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Odoo MCP Server running on stdio");
  }
}

const server = new OdooMCPServer();
server.run().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});