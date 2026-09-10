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

Deployed to Cloud Run in `europe-north1`, alongside the `recipeEmbeddingUpdate`
trigger and the `READY` vector index.

**Endpoint:** `https://veganflora-mcp-520915943790.europe-north1.run.app/mcp`
**Transport:** Streamable HTTP · **Auth:** `Authorization: Bearer <MCP_BEARER_TOKEN>`

Fetch the token (do not paste it into a chat or commit it):

```bash
gcloud secrets versions access latest --secret=MCP_BEARER_TOKEN --project=veganflora
```

### Redeploying

`gcloud run deploy --source` does **not** work here. It looks for a Dockerfile at
the build root, finds none, and falls back to Buildpacks, which cannot install
this pnpm workspace. Build via Cloud Build with an explicit Dockerfile instead:

```bash
IMAGE=europe-north1-docker.pkg.dev/veganflora/cloud-run-source-deploy/veganflora-mcp:$(git rev-parse --short HEAD)
gcloud builds submit --config=cloudbuild.mcp.yaml --substitutions=_IMAGE="$IMAGE" --project=veganflora --region=europe-north1
gcloud run deploy veganflora-mcp --image="$IMAGE" --project=veganflora --region=europe-north1 --allow-unauthenticated --set-secrets="MCP_BEARER_TOKEN=MCP_BEARER_TOKEN:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" --service-account=520915943790-compute@developer.gserviceaccount.com
```

`mcp/Dockerfile` builds from the **repo root** (`-f mcp/Dockerfile .`) because pnpm
needs the root lockfile and `pnpm-workspace.yaml` to resolve the `catalog:`
protocol. Both the install and the `pnpm deploy` step pass `--ignore-scripts`:
pnpm blocks unapproved postinstall scripts by default, and none of the offenders
(biome, esbuild, protobufjs, re2) are needed to run the server.

### Rotating the token

```bash
openssl rand -base64 32 | tr -d '\n' | gcloud secrets versions add MCP_BEARER_TOKEN --data-file=- --project=veganflora
gcloud run services update veganflora-mcp --project=veganflora --region=europe-north1 --set-secrets="MCP_BEARER_TOKEN=MCP_BEARER_TOKEN:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

### Security posture

The service has **public ingress** (`--allow-unauthenticated` at the network
layer), so the bearer token is the sole access control on a read/write endpoint.
Cloud Run IAM invoker auth would be stronger but requires a Google-signed token
most MCP clients cannot produce. The runtime service account is the shared
default compute account, which means every function in the project can also read
`MCP_BEARER_TOKEN`; a dedicated service account would narrow that.

## Verification (2026-09-08)

Executed against the live `veganflora` project.

| Check | Result |
|---|---|
| Vector index | `READY` (`__name__`, `embedding`) |
| Backfill | `embedded=144 skipped=0 failed=0` |
| Backfill re-run | `embedded=0 skipped=144 failed=0` — idempotent |
| Trigger deploy | `recipeEmbeddingUpdate(europe-north1)` created |
| Trigger fires on content change | hash `1c12cf2b` -> `8a3561a5` |
| **No recursion** | hash stable across 9 polls / 54s after the write-back |
| Revert round-trip | hash returned to `1c12cf2b`, text restored to 854 chars |
| Local suite | 50 tests, 7 suites, all passing |

### Search quality, measured

Real queries against the live index, cosine distance (lower is closer):

- `"snabb vardagsmiddag med tofu"` -> Tofustroganoff (0.236), Tofu stroganoff
  (0.245), Fräsch wok med sticky tofu (0.257). **Strong** — all five hits were
  tofu weeknight dishes.
- `"recept med kikärtor"` -> Hummus (0.256), Kikärtsomelett (0.259), Biffar med
  kikärtor (0.260). **Good, with the expected caveat**: 4 of 5 genuinely contain
  chickpeas, but "Pasta med pesto och valnötter" (0.267) does not — vector search
  ranks on similarity, not membership.
- `"något värmande till en kall kväll"` -> Kalljästa morgonbullar (0.366),
  Kålpudding (0.369), Black bean chili (0.372). **Weakest.** Distances cluster
  around 0.37 (nothing strongly matched) and the top hit is a false friend —
  "kall" matching "kalljästa". Abstract mood queries are the real limitation.

For exact ingredient or tag questions, prefer `list_recipes` with a filter.
