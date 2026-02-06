# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Veganflora is a Swedish vegan recipe collection web application built with Firebase, Vue 2, and Cloud Functions. Recipes are sourced from the books "Foodpharamacy", "Förbättra din tarmflora", and "Hälsorevolutionen". The project uses a monorepo structure managed with pnpm workspaces and Turbo.

## Technology Stack

- **Frontend**: Vue 2.7 with TypeScript, Bootstrap Vue, Vue Router
- **Backend**: Firebase Cloud Functions (Node 22, TypeScript)
- **Database**: Cloud Firestore
- **Hosting**: Firebase Hosting
- **Build Tool**: Vue CLI (webapp), TypeScript compiler (functions, ingest)
- **Package Manager**: pnpm (enforced via preinstall hook)
- **Monorepo**: Turbo with 3 workspaces: `webapp`, `functions`, `ingest`
- **Code Quality**: Biome for linting and formatting

## Common Commands

### Development

```bash
# Install dependencies (must use pnpm)
pnpm install

# Start webapp dev server
pnpm --filter webapp dev

# Serve Firebase Functions locally with emulator
pnpm --filter functions serve

# Build all workspaces
pnpm build

# Build specific workspace
pnpm --filter webapp build
pnpm --filter functions build
```

### Code Quality

```bash
# Format all workspaces
pnpm format

# Lint all workspaces
pnpm lint

# Type check
pnpm --filter functions typecheck
pnpm --filter ingest typecheck
```

### Testing

```bash
# Run webapp unit tests
pnpm --filter webapp test

# Run ingest tests
pnpm --filter ingest test
```

### Firebase Deployment

```bash
# Deploy functions only
pnpm --filter functions deploy

# Deploy everything (uses predeploy hooks defined in firebase.json)
firebase deploy

# View function logs
firebase functions:log
```

### Utility Scripts

```bash
# Test recipe summarization (requires GEMINI_API_KEY in .env)
pnpm --filter functions script:summarize

# Fix recipe tags in database
pnpm --filter ingest script:fixtags
```

## Project Structure

### Workspaces

- **webapp/**: Vue 2 SPA for browsing and editing recipes
  - `src/views/`: Page components (RecipeEdit, RecipeShow, Menu, Groceries, Units)
  - `src/components/`: Reusable Vue components for recipes, menus, and tags
  - `src/modules/use/`: Composable functions (recipes, import, menu, auth, prefill)
  - `src/modules/ingredients.ts`: Ingredient parsing and conversion logic
  - `src/firebase-plugin.ts`: Firebase initialization with persistent local cache

- **functions/**: Firebase Cloud Functions for backend logic
  - `src/index.ts`: Main exports for Cloud Functions
    - `importUrl`: Callable function to fetch and summarize recipe URLs using Gemini
    - `importText`: Callable function for text summarization
    - `prefillUpdate`: Firestore trigger that maintains tag and category lists
    - `mcp`: HTTP endpoint serving an MCP server for Claude Code integration
  - `src/mcp.ts`: MCP server definition with recipe tools
  - `src/summarize.ts`: Shared AI summarization logic (Gemini via OpenAI-compatible API)
  - `scripts/summarize.ts`: CLI tool for testing recipe summarization

- **ingest/**: Scripts for importing recipes from markdown files to Firestore
  - `json-gen.ts`: Parses markdown recipe files and uploads to Firestore
  - `fix-tags.ts`: Utility for fixing tag data structure in existing recipes
  - `src/ingredients.ts`: Ingredient parsing utilities

### Firebase Configuration

- **Firestore Structure**:
  - Collection: `/veganflora/root/recipies/{recipeId}`
  - Root document: `/veganflora/root` contains `prefill.tags` and `prefill.categories`

- **Cloud Functions Region**: `europe-north1`
- **Functions Timeout**: 120 seconds
- **CORS**: Restricted to `https://veganflora.web.app`

### Recipe Data Model

Recipes contain:
- `title`: Swedish recipe name
- `size`: Portion size (e.g. "6 portioner", "12 bullar")
- `ingredients[]`: Array of `{name, amount, measure}` objects
- `text`: Markdown-formatted step-by-step instructions
- `category[]`: Hierarchical category path
- `tags[]`: Array of tag strings
- `image`: Optional image URL or path

### AI Recipe Summarization

The `importUrl` function uses Gemini 3 Pro via OpenAI-compatible API to:
1. Fetch recipe content from a URL
2. Parse and convert to Swedish with Swedish units (dl, tsk, msk, gram)
3. Extract structured JSON with title, ingredients, instructions, portion size, and image
4. Remove brand names and unnecessary garnish ingredients
5. Format instructions as clean bullet-point steps

## Development Notes

### TypeScript Configuration

- **functions/**: Uses `@tsconfig/node22` with ES modules (`type: "module"` in package.json)
- **webapp/**: Vue 2.7 TypeScript setup with `@/` path alias for `src/`
- **ingest/**: Uses `@tsconfig/node22`

### Firebase Deployment Process

The `firebase.json` predeploy hooks handle:
1. **Functions**: Strips `devDependencies` from package.json, builds TypeScript, then restores package.json
2. **Hosting**: Builds webapp with dependency-aware build via `--filter ...webapp`

### Code Style

- Biome enforces consistent formatting (120 char line width)
- JavaScript: semicolons "asNeeded"
- Functions use ES modules; import statements required
- Vue components use Options API (Vue 2.7)

### Important File Locations

- Firebase config: `firebase.json`, `.firebaserc`
- Workspace config: `pnpm-workspace.yaml`
- Build config: `turbo.json`
- Biome configs: `webapp/biome.json`, `functions/biome.json`, `ingest/biome.json`

## Git Workflow

- Main branch: `master`
- Current branch: Always switch to `main` before creating new branches for PRs (as per user's global instructions)

## Environment Variables

- **Functions**: `GEMINI_API_KEY` and `MCP_API_KEY` secrets defined via Firebase Secret Manager
- **Webapp**: Firebase config is hardcoded in `firebase-plugin.ts` (public API key)
- **Local**: `VEGANFLORA_MCP_KEY` env var for Claude Code MCP authentication

## MCP Server Setup (Claude Code)

The project includes an MCP server deployed as a Firebase Cloud Function. It gives Claude Code direct access to the recipe database.

### Available tools

- `search_recipes` — search by title, tag, category, or ingredient
- `get_recipe` — get a full recipe by document key
- `list_tags` — list all tags
- `list_categories` — list all categories
- `import_recipe_from_url` — fetch and summarize a recipe from a URL via Gemini
- `import_recipe_from_text` — summarize raw recipe text via Gemini

### First-time deployment

1. Generate a secret and set it in Firebase:
   ```bash
   export VEGANFLORA_MCP_KEY=$(openssl rand -hex 32) && echo "$VEGANFLORA_MCP_KEY" | firebase functions:secrets:set MCP_API_KEY --data-file -
   ```
2. Save the key to your shell profile:
   ```bash
   echo "export VEGANFLORA_MCP_KEY=\"$VEGANFLORA_MCP_KEY\"" >> ~/.zshrc
   ```
3. Deploy:
   ```bash
   firebase deploy --only functions
   ```
4. Copy the `mcp` function URL from the deploy output and update the `url` field in `.mcp.json`.

The `.mcp.json` in the project root configures the MCP server automatically. Start Claude Code from the project directory and the veganflora tools will be available.

## Testing Recipe Import

To test the AI recipe summarization locally:
1. Create `.env` in `functions/` with `GEMINI_API_KEY=your_key`
2. Run `pnpm --filter functions script:summarize`
3. Enter a recipe URL when prompted
