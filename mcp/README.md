# veganflora recipes MCP server

Exposes the veganflora recipe collection to an external AI harness over MCP
(Streamable HTTP), with read and write access to **recipes only**.

Design: [`docs/superpowers/specs/2026-09-08-recipes-mcp-server-design.md`](../docs/superpowers/specs/2026-09-08-recipes-mcp-server-design.md)

## Tools

| Tool | Purpose |
|---|---|
| `search_recipes` | Semantic (vector) search over the collection |
| `get_recipe` | Fetch one full recipe by document id |
| `list_recipes` | List/paginate, optionally filtered by exact category or tag |
| `create_recipe` | Create a recipe; fails if the derived id already exists |
| `update_recipe` | Merge named fields into an existing recipe |

There is deliberately **no delete tool**. Deletion stays in the webapp.

`search_recipes` is semantic: it is good at "något värmande till en kall kväll"
and weak at exact membership ("recept med kikärtor"). Use `list_recipes` with a
`category` or `tag` filter for precise queries.

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `MCP_BEARER_TOKEN` | yes | The only access control on `/mcp` |
| `GEMINI_API_KEY` | yes | Generates query embeddings at search time |
| `PORT` | no | Listen port, defaults to `8080` |

**The bearer token is the entire security boundary.** Anyone holding it has full
read and write access to the recipe collection. Use a long random value, keep it
in Secret Manager, and rotate it by changing the secret and restarting.

`/health` is intentionally unauthenticated so uptime probes need no credential.
Every `/mcp` request is rejected with `401` before touching Firestore.

## Embeddings

The `recipeEmbeddingUpdate` Firestore trigger in `functions/` is the **sole
owner** of the `embedding` and `embeddingHash` fields. It fires on every write to
`/veganflora/root/recipies/{id}` regardless of origin (webapp, `importUrl`, or
this server), so a recipe created anywhere becomes searchable.

The trigger writes back to the document that triggered it. A content hash guard
short-circuits the second invocation — without it the trigger would recurse
indefinitely. `mcp/test/embedding-parity.spec.ts` pins that guard and the
duplicated hash logic across the two workspaces.

Model: `gemini-embedding-001` at 768 dimensions (Firestore's limit is 2048).

## Setup

### 1. Create the vector index

`findNearest` returns `FAILED_PRECONDITION` without a matching index:

```bash
gcloud firestore indexes composite create --collection-group=recipies --query-scope=COLLECTION --field-config=vector-config='{"dimension":"768","flat":"{}"}',field-path=embedding --project=veganflora
```

Index creation is asynchronous. Wait for `READY`:

```bash
gcloud firestore indexes composite list --project=veganflora
```

### 2. Backfill existing recipes

The 144 existing recipes predate the trigger and will never be rewritten on
their own, so search returns nothing until they are embedded.

```bash
GEMINI_API_KEY=<key> pnpm --filter mcp script:backfill -- --dry-run
GEMINI_API_KEY=<key> pnpm --filter mcp script:backfill
```

The script is idempotent — re-running it reports `embedded=0` and is the
recovery path for any document the trigger failed to embed.

## Development

```bash
firebase emulators:start --only firestore   # required for tests
pnpm --filter mcp test
pnpm --filter mcp typecheck
pnpm --filter mcp check

GEMINI_API_KEY=<key> MCP_BEARER_TOKEN=<token> pnpm --filter mcp dev
```

Tests run against the Firestore emulator on `127.0.0.1:8080`. The emulator
serves `findNearest` without a vector index, so vector ranking is covered
locally; production still needs the index above.

## Deployment

Not yet deployed. Hosting (Cloud Run service, Secret Manager wiring for
`MCP_BEARER_TOKEN`, pointing the consuming harness at the deployed URL) is a
separate change.
