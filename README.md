# Veganflora

A collection of swedish recipies based on the books Foodpharamacy, "Förbättra din tarmflora" and Hälsorevolutionen. 

All recipies are also vegan. 

## Connect Claude (MCP)

The recipe collection is available as an MCP server, so Claude can search, read and save recipes.
Copy-paste instructions are at **https://veganflora.web.app/mcp**.

**Endpoint:** `https://veganflora-mcp-520915943790.europe-north1.run.app/mcp`
**Auth:** Google sign-in (OAuth); only allowlisted accounts get in.

Claude Code:

```bash
claude mcp add --transport http \
  --client-id 520915943790-lmrgh4k6vh5ugnsqhc9muhglmhd27i78.apps.googleusercontent.com \
  --client-secret --callback-port 33418 \
  veganflora-recipes https://veganflora-mcp-520915943790.europe-north1.run.app/mcp
```

Enter the OAuth client secret when prompted, then run `/mcp` → `veganflora-recipes` → **Authenticate**.

claude.ai: **Settings → Connectors → Add custom connector**, paste the endpoint, and enter the
client id and secret under **Advanced settings**.

Server details, setup and deployment: [`mcp/README.md`](mcp/README.md).
