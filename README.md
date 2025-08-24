# Odoo MCP Server

Un serveur MCP (Model Context Protocol) pour intégrer Odoo avec Claude Desktop.

## Installation

1. Clonez ce repository
2. Installez les dépendances : `npm install`
3. Compilez le projet : `npm run build`
4. Copiez `.env.example` vers `.env` et configurez vos variables

## Configuration dans Claude Desktop

Ajoutez cette configuration dans votre fichier de configuration Claude Desktop (`claude_desktop_config.json`) :

```json
{
  "mcpServers": {
    "odoo-server": {
      "command": "node",
      "args": ["/chemin/vers/votre/projet/build/index.js"],
      "env": {
        "AUTH0_DOMAIN": "votre-domaine.auth0.com",
        "AUTH0_AUDIENCE": "https://votre-api-audience"
      }
    }
  }
}
```

**Remplacez `/chemin/vers/votre/projet/` avec le chemin complet vers votre dossier du projet.**

## Outils Disponibles

1. **ping** - Test de connectivité
2. **echo** - Echo d'un message
3. **odoo_query** - Exécution de requêtes Odoo (en développement)

## Test

Pour tester si le serveur fonctionne :
```bash
npm start
```

Le serveur devrait afficher "Odoo MCP Server running on stdio".

## Structure du Projet

- `src/index.ts` - Code source principal du serveur MCP
- `build/` - Code compilé (généré par TypeScript)
- `package.json` - Configuration npm et dépendances
- `tsconfig.json` - Configuration TypeScript

## Prochaines Étapes

1. ✅ Serveur MCP fonctionnel avec stdio transport (comme E2B)
2. ✅ Outils de base (ping, echo, odoo_query)
3. 🔄 Intégration complète avec Odoo API
4. 🔄 Authentification Auth0 (optionnelle pour stdio)
5. 🔄 Tests avec Claude Desktop