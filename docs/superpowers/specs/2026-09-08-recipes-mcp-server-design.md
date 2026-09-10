# Veganflora Recipes MCP Server — Design

Date: 2026-09-08
Status: Approved for planning

## Purpose

Expose the veganflora recipe collection to an external AI harness over MCP,
with read and write access to recipes only.

The consumer is a non-Claude-Code harness speaking MCP over HTTP.

## Scope

In scope: recipes (`/veganflora/root/recipies/{id}`) — search, read, list,
create, update.

Out of scope: menus, groceries, units, recipe deletion, OAuth, per-user
auth, streaming/SSE responses, session resumption.

## Decisions

| Area | Decision |
|---|---|
| Access | Read + write, recipes only |
| Search | Firestore native vector search (`findNearest`) |
| Embeddings | Owned by a Firestore `onWrite` trigger, plus a backfill script |
| Transport | Streamable HTTP, non-streaming JSON responses |
| Region | `europe-north1` (matches existing functions) |
| Auth | Static bearer token from Secret Manager |
| Deletes | Not exposed |

### Why vector search

Firestore has no native full-text search on text fields; a third-party
search service would be required for lexical search. Firestore does support
native vector search via `findNearest` (max 2048 dimensions, combinable with
`where()` filters).

Accepted tradeoff: vector search answers semantic queries ("something
warming for a cold evening") well and exact-membership queries ("recipes
containing chickpeas") poorly. `list_recipes` with category/tag filters is
the precise-query path. A lexical fallback can be added later without
changing the tool surface.

### Why the trigger owns embeddings

Recipes are written by the webapp, by `importUrl`, and by this MCP server.
If the MCP server generated embeddings, recipes created through the webapp
would silently have no embedding and be invisible to search. A Firestore
trigger covers every write path regardless of origin.

## Architecture

```
harness --HTTP + bearer--> mcp/ server --> Firestore /veganflora/root/recipies
                                |
                                +-- Gemini embed (query embeddings only)

webapp / importUrl / MCP write --> Firestore
                                       |
                                       v
                            recipeEmbeddingUpdate trigger
                                       |
                                       +-- Gemini embed --> writes `embedding` + `embeddingHash`
```

The MCP server never writes the `embedding` field. It reads embeddings via
`findNearest` and generates a query embedding at search time.

## Components

### 1. `mcp/` workspace

New fourth pnpm workspace alongside `webapp`, `functions`, `ingest`.
Node 22, ESM, TypeScript, Biome — mirroring `functions/`.

Added to `pnpm-workspace.yaml` packages list.

#### Tools

| Tool | Behavior |
|---|---|
| `search_recipes` | Embed query, `findNearest` over `embedding`, return ranked summaries + distance |
| `get_recipe` | Full recipe by document ID |
| `list_recipes` | Paginated; optional `category` / `tag` filter via `array-contains` |
| `create_recipe` | Validate, derive ID from category + slugified title, refuse if ID exists |
| `update_recipe` | Partial merge on an allowlist of fields |

No `delete_recipe`. Deletion stays in the webapp, where it is deliberate.

`update_recipe` accepts only: `title`, `size`, `ingredients`, `text`,
`category`, `tags`, `image`. It cannot write `embedding`, `embeddingHash`,
or arbitrary fields. Omitted fields are left untouched.

#### Document ID derivation

Reuses the exact rules from `ingest/json-gen.ts`:

- `/` -> `\`
- `ö` -> `oe`, `ä` -> `ae`, `å` -> `aa`
- remaining non-word characters -> `_`
- category segments joined by `\`, then `\` + slugified title

`create_recipe` performs a `get()` before writing and returns an error if
the ID already exists. The existing ingest script overwrites in this case;
the MCP server must not inherit that behavior.

### 2. `recipeEmbeddingUpdate` trigger (`functions/`)

`onDocumentWritten` on `/veganflora/root/recipies/{id}`, `europe-north1`,
using `@google/genai` (already a dependency) and the existing
`GEMINI_API_KEY` secret.

Logic:

1. Concatenate `title` + ingredient names + `text`.
2. Hash that string.
3. If the hash equals the stored `embeddingHash`, return without writing.
4. Otherwise embed, then write `embedding` + `embeddingHash` back.

The hash guard is required, not an optimization: the write-back retriggers
the same trigger, and without the guard it recurses indefinitely. The
existing `prefillUpdate` trigger writes back to its own document the same
way, so this pattern needs care.

Embedding failures are logged and swallowed — a Gemini outage must not block
recipe writes. The backfill script recovers anything missed.

A vector index on `embedding` is required for `findNearest`.

### 3. `mcp/scripts/backfill-embeddings.ts`

One-shot backfill for the existing ~50 recipes. Idempotent via the same hash
check, so re-running costs nothing.

## Auth

Single middleware, before any tool dispatch: constant-time comparison of the
`Authorization: Bearer` header against `MCP_BEARER_TOKEN` from Secret
Manager. Missing or wrong token returns `401` and never touches Firestore.

The bearer token is the entire security boundary — anyone holding it has
full read+write on recipes. It must be long, random, and rotatable via
Secret Manager.

## Error handling

- Tool errors return MCP tool errors with actionable messages, never stack traces.
- Firestore and Gemini failures are caught per-tool; one failing call cannot take the server down.
- The trigger logs and swallows embedding failures.

## Testing

Jest against the Firestore emulator, following the existing `ingest/` Jest setup.

- Unit: document ID derivation, partial-merge semantics, hash-skip logic.
- Integration: each tool against the emulator.
- Auth: missing token, wrong token, valid token.
- Gemini is stubbed; no live API calls in tests.

## Risks

1. **Bearer token is the whole security boundary.** Compromise means full
   read+write on recipes. Mitigated by length, randomness, and rotation.
2. **Vector search underperforms on exact-ingredient queries.** Accepted;
   `list_recipes` filters carry precise queries, and a lexical fallback
   remains cheap to add.
