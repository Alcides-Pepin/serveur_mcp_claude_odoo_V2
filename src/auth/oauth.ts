import { Express } from 'express';

export function setupOAuthEndpoints(app: Express) {
  // OAuth Authorization Server Discovery (RFC 8414)
  app.get('/.well-known/oauth-authorization-server', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `https://${process.env.AUTH0_DOMAIN}/authorize`,
      token_endpoint: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      device_authorization_endpoint: `https://${process.env.AUTH0_DOMAIN}/oauth/device/code`,
      userinfo_endpoint: `https://${process.env.AUTH0_DOMAIN}/userinfo`,
      jwks_uri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      scopes_supported: ["openid", "profile", "email", "mcp:access"],
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: [
        "authorization_code",
        "urn:ietf:params:oauth:grant-type:device_code"
      ],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: [
        "client_secret_basic",
        "client_secret_post",
        "none"
      ]
    });
  });

  // OAuth Protected Resource Discovery (RFC 9626)  
  app.get('/.well-known/oauth-protected-resource', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.json({
      resource: baseUrl,
      authorization_servers: [`https://${process.env.AUTH0_DOMAIN}`],
      scopes_supported: ["mcp:access"],
      bearer_methods_supported: ["header"],
      resource_documentation: `${baseUrl}/docs`
    });
  });

  // Dynamic Client Registration (RFC 7591)
  app.post('/oauth/register', (req, res) => {
    // For Claude.ai compatibility, we need to support dynamic client registration
    // This is a simplified implementation - in production, you'd want more validation
    
    const {
      client_name,
      redirect_uris,
      grant_types = ["authorization_code"],
      response_types = ["code"],
      scope = "openid profile email mcp:access"
    } = req.body;

    if (!client_name || !redirect_uris || !Array.isArray(redirect_uris)) {
      return res.status(400).json({
        error: "invalid_client_metadata",
        error_description: "client_name and redirect_uris are required"
      });
    }

    // Generate a client ID for this registration
    // In production, you'd store this in a database
    const client_id = `dyn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      client_id,
      client_name,
      redirect_uris,
      grant_types,
      response_types,
      scope,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      // For public clients (like Claude.ai), no client_secret is issued
      token_endpoint_auth_method: "none"
    });
  });
}