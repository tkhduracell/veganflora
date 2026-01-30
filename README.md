# Veganflora

A collection of swedish recipies based on the books Foodpharamacy, "Förbättra din tarmflora" and Hälsorevolutionen. 

All recipies are also vegan.

## MCP Server (Claude Code)

This project has an MCP server that gives Claude Code access to the recipe database. Get the server URL and API key from the project owner, then run:

```bash
claude mcp add --transport http -s user --header "Authorization: Bearer $VEGANFLORA_MCP_KEY" veganflora <server-url>
```

Make sure `VEGANFLORA_MCP_KEY` is set in your environment before running the command.
