import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { setupOAuthEndpoints } from './auth/oauth';
import { setupMCPEndpoints } from './mcp/server';
import { authMiddleware } from './auth/middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: process.env.MCP_SERVER_NAME || 'MCP Auth0 Server'
  });
});

// OAuth Discovery and Authorization endpoints
setupOAuthEndpoints(app);

// MCP endpoints (protected by auth)
app.use('/mcp', authMiddleware);
setupMCPEndpoints(app);

// Root endpoint with server info
app.get('/', (req, res) => {
  res.json({
    name: process.env.MCP_SERVER_NAME || 'MCP Auth0 Server',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
    description: 'Model Context Protocol server with Auth0 authentication',
    endpoints: {
      health: '/health',
      oauth_discovery: '/.well-known/oauth-authorization-server',
      resource_discovery: '/.well-known/oauth-protected-resource',
      mcp: '/mcp'
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MCP Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 OAuth discovery: http://localhost:${PORT}/.well-known/oauth-authorization-server`);
  console.log(`⚡ MCP endpoint: http://localhost:${PORT}/mcp`);
});

export default app;