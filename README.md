# MCP Server with Auth0 Authentication

A Model Context Protocol (MCP) server with Auth0 authentication for Claude integration.

## Features

- 🔐 Auth0 OAuth 2.0 authentication with PKCE support
- 🚀 Railway-ready deployment configuration
- ⚡ TypeScript implementation with the official MCP SDK
- 🛡️ Security best practices (Helmet, CORS)
- 📋 OAuth Discovery endpoints (RFC 8414, RFC 9626)
- 🔧 Dynamic Client Registration (RFC 7591)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `AUTH0_DOMAIN`: Your Auth0 domain
- `AUTH0_CLIENT_ID`: Auth0 application client ID
- `AUTH0_CLIENT_SECRET`: Auth0 application client secret
- `AUTH0_AUDIENCE`: Auth0 API audience

### 3. Development

```bash
npm run dev
```

### 4. Build & Deploy

```bash
npm run build
npm start
```

## API Endpoints

### OAuth Discovery
- `/.well-known/oauth-authorization-server` - OAuth Authorization Server metadata
- `/.well-known/oauth-protected-resource` - OAuth Protected Resource metadata
- `/oauth/register` - Dynamic Client Registration

### MCP Endpoints (Authenticated)
- `/mcp` - Server info and capabilities
- `/mcp/tools/list` - List available tools
- `/mcp/tools/call` - Execute a tool
- `/mcp/resources/list` - List available resources
- `/mcp/resources/read` - Read a resource

### Utility
- `/health` - Health check endpoint
- `/` - Server information

## Available Tools

1. **echo** - Echo back a message
2. **get_user_info** - Get authenticated user information

## Available Resources

1. **user://profile** - Current user's profile information

## Deployment on Railway

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway will automatically deploy on push to main branch

## Auth0 Configuration

Your Auth0 application should be configured as:
- Application Type: Single Page Application
- Token Endpoint Authentication Method: None
- Allowed Callback URLs: Include your Claude callback URL
- Allowed Web Origins: Your Railway domain

## Claude Integration

Add this MCP server to Claude using:
```json
{
  "name": "auth0-mcp-server",
  "uri": "https://your-railway-domain.railway.app/mcp",
  "auth": {
    "type": "oauth2",
    "authorization_url": "https://your-auth0-domain.auth0.com/authorize",
    "token_url": "https://your-auth0-domain.auth0.com/oauth/token",
    "scope": "openid profile email mcp:access"
  }
}
```