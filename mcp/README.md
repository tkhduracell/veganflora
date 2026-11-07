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
| `GEMINI_API_KEY` | yes | Generates query embeddings at search time |
| `MCP_PUBLIC_URL` | yes | Public URL of `/mcp`; the OAuth `resource` identifier |
| `GOOGLE_OAUTH_CLIENT_IDS` | one of these two | Comma-separated Google OAuth client ids whose access tokens are accepted |
| `MCP_ALLOWED_EMAILS` | with the above | Comma-separated Google accounts allowed in |
| `MCP_BEARER_TOKEN` | one of these two | Legacy static token, accepted alongside Google OAuth |
| `PORT` | no | Listen port, defaults to `8080` |

## Authentication

The server is an OAuth 2.1 **resource server** (MCP authorization spec), and
Google is its authorization server. Anyone with full access gets read and write
access to the whole recipe collection, so the access checks are strict:

1. An unauthenticated `/mcp` request gets `401` with
   `WWW-Authenticate: Bearer resource_metadata=".../.well-known/oauth-protected-resource/mcp"`.
2. That document (RFC 9728) names `https://accounts.google.com` as the
   authorization server. The client signs the user in with Google (PKCE, scopes
   `openid email`).
3. Every Google access token is checked against Google's `tokeninfo`. The
   token's `aud` must be one of `GOOGLE_OAUTH_CLIENT_IDS`, so a token minted for
   any other app is rejected. The email must be verified and listed in
   `MCP_ALLOWED_EMAILS`. A verified token is cached until it expires.

Google has **no dynamic client registration**, so every MCP client must be
configured with our client id and secret (see [Connecting a client](#connecting-a-client)).

`MCP_BEARER_TOKEN` still works as a static credential while clients migrate.
Leave it unset to require Google sign-in only.

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

GEMINI_API_KEY=<key> MCP_BEARER_TOKEN=<token> MCP_PUBLIC_URL=http://localhost:8080/mcp pnpm --filter mcp dev
```

Tests run against the Firestore emulator on `127.0.0.1:8080`. The emulator
serves `findNearest` without a vector index, so vector ranking is covered
locally; production still needs the index above.

## Deployment

Deployed to Cloud Run in `europe-north1`, alongside the `recipeEmbeddingUpdate`
trigger and the `READY` vector index.

**Endpoint:** `https://veganflora-mcp-520915943790.europe-north1.run.app/mcp`
**Transport:** Streamable HTTP · **Auth:** Google OAuth (or legacy `Authorization: Bearer <MCP_BEARER_TOKEN>`)

### Google OAuth setup (one-time)

1. In the `veganflora` project, open **Google Auth Platform**. Configure the
   consent screen as **External**, keep it in **Testing**, and add the allowed
   accounts as test users. Scopes: `openid`, `.../auth/userinfo.email`.
2. Under **Clients**, create a **Web application** client with these
   authorized redirect URIs:
   - `https://claude.ai/api/mcp/auth_callback` (claude.ai connectors)
   - `http://localhost:33418/callback` (Claude Code, fixed `--callback-port`)
3. Store the client id and the allowlist. The deploy job mounts both:

```bash
printf '%s' '<client-id>.apps.googleusercontent.com' | gcloud secrets create GOOGLE_OAUTH_CLIENT_IDS --data-file=- --project=veganflora
printf '%s' 'you@gmail.com' | gcloud secrets create MCP_ALLOWED_EMAILS --data-file=- --project=veganflora
```

The client secret is never given to the server; only MCP clients use it.

### Connecting a client

Claude Code:

```bash
claude mcp add --transport http --client-id <client-id> --client-secret --callback-port 33418 \
  veganflora-recipes https://veganflora-mcp-520915943790.europe-north1.run.app/mcp
```

Then run `/mcp` → `veganflora-recipes` → **Authenticate**.

claude.ai: **Settings → Connectors → Add custom connector**, paste the endpoint,
choose **Sign in now**, then **Use your own OAuth client** with the client id and
secret. Google supports neither CIMD nor dynamic registration, so the other OAuth
client options fail.

Legacy token (do not paste it into a chat or commit it):

```bash
gcloud secrets versions access latest --secret=MCP_BEARER_TOKEN --project=veganflora
```

### Redeploying

Automatic. The `deploy-mcp` job in `.github/workflows/node.js.yml` builds the
image on every PR and, on push to `master`, pushes it to Artifact Registry and
deploys to Cloud Run — the same shape as `deploy-functions` and `deploy-webapp`.
CI authenticates via Workload Identity Federation (no long-lived key), using the
`github-deploy-auth-pool` provider scoped to this repository.

`mcp/Dockerfile` builds from the **repo root** (`-f mcp/Dockerfile .`) because pnpm
needs the root lockfile and `pnpm-workspace.yaml` to resolve the `catalog:`
protocol. Both the install and the `pnpm deploy` step pass `--ignore-scripts`:
pnpm blocks unapproved postinstall scripts by default, and none of the offenders
(biome, esbuild, protobufjs, re2) are needed to run the server.

Note that `gcloud run deploy --source` does **not** work for this service: it
looks for a Dockerfile at the build root, finds none, and falls back to
Buildpacks, which cannot install this pnpm workspace.

### Rotating the token

```bash
openssl rand -base64 32 | tr -d '\n' | gcloud secrets versions add MCP_BEARER_TOKEN --data-file=- --project=veganflora
gcloud run services update veganflora-mcp --project=veganflora --region=europe-north1 --update-secrets="MCP_BEARER_TOKEN=MCP_BEARER_TOKEN:latest"
```

### Security posture

The service has **public ingress** (`--allow-unauthenticated` at the network
layer), so application-level auth is the only access control on a read/write
endpoint: Google OAuth plus the email allowlist, and the legacy bearer token
while it remains set. Cloud Run IAM invoker auth would be stronger but requires
a Google-signed ID token most MCP clients cannot produce. The runtime service account is the shared
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
