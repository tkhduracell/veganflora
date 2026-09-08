# Recipes MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the veganflora recipe collection to an external AI harness over MCP with read and write access to recipes only.

**Architecture:** A new `mcp/` pnpm workspace runs a stateless Streamable HTTP MCP server guarded by a static bearer token. Search uses Firestore native vector search (`findNearest`) over an `embedding` field. A Firestore `onWrite` trigger in `functions/` is the sole owner of that field, so recipes written by any client (webapp, `importUrl`, or this server) become searchable.

**Tech Stack:** Node 22, TypeScript (ESM), `@modelcontextprotocol/server` + `/node` + `/express` v2, Express 5, `firebase-admin` 13, `@google/genai`, Jest + ts-jest, Biome.

**Spec:** `docs/superpowers/specs/2026-09-08-recipes-mcp-server-design.md`

## Global Constraints

- Node 22 (`"engines": {"node": "22"}`), ESM (`"type": "module"`) — matches `functions/`.
- Package manager is pnpm. Never run `npm install` or `yarn`. Enforced by a `preinstall` hook.
- Firestore collection path: `veganflora/root/recipies` (note the misspelling — it is the real path).
- Cloud region: `europe-north1`.
- Biome for lint/format, 120 char line width, semicolons "asNeeded", tabs for indentation.
- MCP SDK v2 scoped packages: `@modelcontextprotocol/server@^2.0.0`, `@modelcontextprotocol/node@^2.0.0`, `@modelcontextprotocol/express@^2.0.0`. NOT the legacy `@modelcontextprotocol/sdk@1.x`.
- Zod imported as `import * as z from "zod/v4"` — this is what MCP SDK v2 expects.
- `firebase-admin@^13.4.0` to match `functions/`. Do not bump it.
- Embedding model: `gemini-embedding-001`, 768 dimensions (must be <= 2048, Firestore's max).
- No `delete_recipe` tool. Ever. Deletion is out of scope.
- Never write the `embedding` or `embeddingHash` fields from the MCP server. The trigger owns them.
- Commit after every task using `git commit -m "type(scope): summary"`. Never use `$()` or heredocs in commit commands.

---

### Task 1: Scaffold the `mcp/` workspace

**Files:**
- Create: `mcp/package.json`
- Create: `mcp/tsconfig.json`
- Create: `mcp/biome.json`
- Create: `mcp/jest.config.js`
- Create: `mcp/.gitignore`
- Modify: `pnpm-workspace.yaml`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a buildable, testable `mcp` workspace. Later tasks add files under `mcp/src/` and `mcp/test/`.

- [ ] **Step 1: Add the workspace to pnpm**

Edit `pnpm-workspace.yaml` — add `mcp` to the `packages` list so it reads:

```yaml
packages:
  - webapp
  - ingest
  - functions
  - mcp
```

Leave `onlyBuiltDependencies` and `catalog` untouched.

- [ ] **Step 2: Create `mcp/package.json`**

```json
{
	"name": "mcp",
	"version": "1.0.0",
	"private": true,
	"type": "module",
	"engines": {
		"node": "22"
	},
	"main": "dist/index.js",
	"scripts": {
		"build": "tsc",
		"start": "node dist/server.js",
		"dev": "tsx watch src/server.ts",
		"test": "NODE_OPTIONS=--experimental-vm-modules jest",
		"typecheck": "tsc --noEmit",
		"lint": "biome lint",
		"format": "biome format",
		"check": "biome check",
		"script:backfill": "tsx scripts/backfill-embeddings.ts"
	},
	"dependencies": {
		"@modelcontextprotocol/server": "^2.0.0",
		"@modelcontextprotocol/node": "^2.0.0",
		"@modelcontextprotocol/express": "^2.0.0",
		"@google/genai": "^1.37.0",
		"express": "^5.1.0",
		"firebase-admin": "^13.4.0",
		"zod": "^4.0.0"
	},
	"devDependencies": {
		"@biomejs/biome": "catalog:",
		"@tsconfig/node22": "^22.0.2",
		"@types/express": "^5.0.0",
		"@types/jest": "^29.5.14",
		"@types/node": "^22.15.30",
		"@types/supertest": "^6.0.2",
		"jest": "^29.7.0",
		"supertest": "^7.0.0",
		"ts-jest": "^29.3.4",
		"tsx": "^4.20.6",
		"typescript": "^5.8.3"
	}
}
```

- [ ] **Step 3: Create `mcp/tsconfig.json`**

Mirrors `functions/tsconfig.json` but emits to `dist/` and includes tests for typechecking.

```json
{
	"extends": "@tsconfig/node22/tsconfig.json",
	"compilerOptions": {
		"preserveConstEnums": true,
		"outDir": "dist",
		"rootDir": "."
	},
	"include": ["src/**/*", "test/**/*", "scripts/**/*"],
	"exclude": ["dist"]
}
```

- [ ] **Step 4: Create `mcp/biome.json`**

Identical to `functions/biome.json`:

```json
{
	"linter": {
		"enabled": true,
		"rules": {
			"recommended": false
		}
	}
}
```

- [ ] **Step 5: Create `mcp/jest.config.js`**

ESM preset — differs from `ingest/jest.config.js` because this workspace is `"type": "module"`.

```javascript
export default {
	preset: "ts-jest/presets/default-esm",
	testEnvironment: "node",
	extensionsToTreatAsEsm: [".ts"],
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	transform: {
		"^.+\\.tsx?$": ["ts-jest", { useESM: true }],
	},
}
```

- [ ] **Step 6: Create `mcp/.gitignore`**

```
dist
node_modules
.env
```

- [ ] **Step 7: Install and verify the workspace resolves**

Run: `pnpm install`
Expected: completes without error, `mcp` appears as a workspace project.

Then run: `pnpm --filter mcp typecheck`
Expected: passes (no source files yet, so nothing to check — an empty pass is correct here).

- [ ] **Step 8: Commit**

```bash
git add pnpm-workspace.yaml mcp/package.json mcp/tsconfig.json mcp/biome.json mcp/jest.config.js mcp/.gitignore pnpm-lock.yaml
git commit -m "chore(mcp): scaffold mcp workspace"
```

---

### Task 2: Recipe types and document ID derivation

**Files:**
- Create: `mcp/src/types.ts`
- Create: `mcp/src/recipe-id.ts`
- Test: `mcp/test/recipe-id.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type Ingredient = { name: string; amount?: string; measure?: string }`
  - `type Recipe = { title: string; size: string; ingredients: Ingredient[]; text: string; category: string[]; tags: string[]; image?: string }`
  - `type StoredRecipe = Recipe & { embedding?: number[]; embeddingHash?: string }`
  - `function slugify(value: string): string`
  - `function recipeDocId(category: string[], title: string): string`

The ID rules replicate `ingest/json-gen.ts` exactly. Read that file before implementing — it is the source of truth for how the existing ~50 document IDs were formed, and diverging from it would make `create_recipe` produce IDs that do not match the collection's convention.

- [ ] **Step 1: Write the failing test**

Create `mcp/test/recipe-id.spec.ts`:

```typescript
import { recipeDocId, slugify } from "../src/recipe-id.js"

describe("slugify", () => {
	it("replaces forward slashes with backslashes", () => {
		expect(slugify("Ris/Quinoa")).toBe("Ris\\Quinoa")
	})

	it("transliterates Swedish characters", () => {
		expect(slugify("Kanelbullar med äpple och örter")).toBe("Kanelbullar_med_aepple_och_oerter")
	})

	it("collapses runs of non-word characters into a single underscore", () => {
		expect(slugify("Pasta   med  -- tomat!")).toBe("Pasta_med_tomat_")
	})

	it("handles uppercase Swedish characters", () => {
		expect(slugify("Ägg Åre Öl")).toBe("Aegg_Aare_Oel")
	})
})

describe("recipeDocId", () => {
	it("joins category segments with backslashes before the title", () => {
		expect(recipeDocId(["Huvudrätter", "Pasta"], "Lasagne")).toBe("Huvudraetter\\Pasta\\Lasagne")
	})

	it("sanitises category segments but keeps Swedish letters", () => {
		expect(recipeDocId(["Bakverk & Bröd"], "Bullar")).toBe("Bakverk_Bröd\\Bullar")
	})

	it("handles a single-segment category", () => {
		expect(recipeDocId(["Soppor"], "Linssoppa")).toBe("Soppor\\Linssoppa")
	})
})
```

Note the asymmetry in the third `recipeDocId` case: category segments are sanitised with `[^\wåäö]+` (which *preserves* å/ä/ö), while the title is sanitised with the transliterating `slugify`. That is what `ingest/json-gen.ts` does, and the existing document IDs depend on it. Do not "fix" this inconsistency — it would orphan existing documents.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mcp test recipe-id`
Expected: FAIL — `Cannot find module '../src/recipe-id.js'`

- [ ] **Step 3: Create `mcp/src/types.ts`**

```typescript
export type Ingredient = {
	name: string
	amount?: string
	measure?: string
}

export type Recipe = {
	title: string
	size: string
	ingredients: Ingredient[]
	text: string
	category: string[]
	tags: string[]
	image?: string
}

export type StoredRecipe = Recipe & {
	embedding?: number[]
	embeddingHash?: string
}

export type RecipeSummary = {
	id: string
	title: string
	category: string[]
	tags: string[]
}
```

- [ ] **Step 4: Write the minimal implementation**

Create `mcp/src/recipe-id.ts`:

```typescript
/**
 * Slug rules replicated from ingest/json-gen.ts. The existing ~50 document
 * IDs were generated with these exact rules; changing them would orphan
 * documents rather than rename them.
 */
export function slugify(title: string): string {
	return title
		.replace(/\//gi, "\\")
		.replace(/ö/gi, "oe")
		.replace(/ä/gi, "ae")
		.replace(/å/gi, "aa")
		.replace(/[\W]+/gi, "_")
}

/**
 * Category segments keep Swedish letters (unlike the title, which
 * transliterates them). This asymmetry is intentional and matches
 * ingest/json-gen.ts.
 */
export function recipeDocId(category: string[], title: string): string {
	const prefix = category.map((s) => s.replace(/[^\wåäö]+/gi, "_")).join("\\")
	return `${prefix}\\${slugify(title)}`
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter mcp test recipe-id`
Expected: PASS, 7 tests.

If a case fails, check it against `ingest/json-gen.ts` before changing the implementation — the test encodes that file's behavior, including its quirks.

- [ ] **Step 6: Commit**

```bash
git add mcp/src/types.ts mcp/src/recipe-id.ts mcp/test/recipe-id.spec.ts
git commit -m "feat(mcp): add recipe types and document id derivation"
```

---

### Task 3: Embedding text and content hashing

**Files:**
- Create: `mcp/src/embedding-content.ts`
- Test: `mcp/test/embedding-content.spec.ts`

**Interfaces:**
- Consumes: `Recipe` from `mcp/src/types.ts`
- Produces:
  - `function embeddingText(recipe: Pick<Recipe, "title" | "ingredients" | "text">): string`
  - `function contentHash(text: string): string`

This module is shared by the trigger (Task 7) and the backfill script (Task 8). It must have no Firestore or network dependencies so both can import it cheaply and tests need no emulator.

- [ ] **Step 1: Write the failing test**

Create `mcp/test/embedding-content.spec.ts`:

```typescript
import { contentHash, embeddingText } from "../src/embedding-content.js"

const recipe = {
	title: "Linssoppa",
	ingredients: [
		{ name: "röda linser", amount: "2", measure: "dl" },
		{ name: "morot", amount: "1", measure: "st" },
	],
	text: "Koka linserna.\nTillsätt morot.",
}

describe("embeddingText", () => {
	it("combines title, ingredient names and text", () => {
		expect(embeddingText(recipe)).toBe("Linssoppa\nröda linser, morot\nKoka linserna.\nTillsätt morot.")
	})

	it("omits amounts and measures", () => {
		expect(embeddingText(recipe)).not.toContain("dl")
	})

	it("handles a recipe with no ingredients", () => {
		expect(embeddingText({ title: "Vatten", ingredients: [], text: "Häll upp." })).toBe("Vatten\n\nHäll upp.")
	})
})

describe("contentHash", () => {
	it("is stable for the same input", () => {
		expect(contentHash("abc")).toBe(contentHash("abc"))
	})

	it("differs for different input", () => {
		expect(contentHash("abc")).not.toBe(contentHash("abd"))
	})

	it("returns a hex sha256 digest", () => {
		expect(contentHash("abc")).toMatch(/^[0-9a-f]{64}$/)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mcp test embedding-content`
Expected: FAIL — `Cannot find module '../src/embedding-content.js'`

- [ ] **Step 3: Write the minimal implementation**

Create `mcp/src/embedding-content.ts`:

```typescript
import { createHash } from "node:crypto"

import type { Recipe } from "./types.js"

/**
 * The text that gets embedded. Amounts and measures are excluded on purpose:
 * "2 dl" carries no semantic signal and only dilutes the vector.
 */
export function embeddingText(recipe: Pick<Recipe, "title" | "ingredients" | "text">): string {
	const names = recipe.ingredients.map((i) => i.name).join(", ")
	return `${recipe.title}\n${names}\n${recipe.text}`
}

export function contentHash(text: string): string {
	return createHash("sha256").update(text, "utf8").digest("hex")
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mcp test embedding-content`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/embedding-content.ts mcp/test/embedding-content.spec.ts
git commit -m "feat(mcp): add embedding text extraction and content hashing"
```

---

### Task 4: Bearer token authentication middleware

**Files:**
- Create: `mcp/src/auth.ts`
- Test: `mcp/test/auth.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `function bearerAuth(expectedToken: string): RequestHandler` — Express middleware that responds `401` and ends the request unless `Authorization: Bearer <expectedToken>` matches.

The comparison must be constant-time. A naive `===` on a secret leaks its length and prefix through timing, and this token is the entire security boundary for a public write endpoint.

- [ ] **Step 1: Write the failing test**

Create `mcp/test/auth.spec.ts`:

```typescript
import express from "express"
import request from "supertest"

import { bearerAuth } from "../src/auth.js"

function appWith(token: string) {
	const app = express()
	app.use(bearerAuth(token))
	app.get("/mcp", (_req, res) => {
		res.json({ ok: true })
	})
	return app
}

describe("bearerAuth", () => {
	it("rejects a request with no Authorization header", async () => {
		const res = await request(appWith("secret")).get("/mcp")
		expect(res.status).toBe(401)
		expect(res.body.ok).toBeUndefined()
	})

	it("rejects a wrong token", async () => {
		const res = await request(appWith("secret")).get("/mcp").set("Authorization", "Bearer wrong")
		expect(res.status).toBe(401)
	})

	it("rejects a token of the same length that differs", async () => {
		const res = await request(appWith("secret")).get("/mcp").set("Authorization", "Bearer secrez")
		expect(res.status).toBe(401)
	})

	it("rejects a non-Bearer scheme carrying the right value", async () => {
		const res = await request(appWith("secret")).get("/mcp").set("Authorization", "Basic secret")
		expect(res.status).toBe(401)
	})

	it("accepts the correct token", async () => {
		const res = await request(appWith("secret")).get("/mcp").set("Authorization", "Bearer secret")
		expect(res.status).toBe(200)
		expect(res.body).toEqual({ ok: true })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mcp test auth`
Expected: FAIL — `Cannot find module '../src/auth.js'`

- [ ] **Step 3: Write the minimal implementation**

Create `mcp/src/auth.ts`:

```typescript
import { timingSafeEqual } from "node:crypto"
import type { RequestHandler } from "express"

function safeEqual(a: string, b: string): boolean {
	const left = Buffer.from(a, "utf8")
	const right = Buffer.from(b, "utf8")
	// timingSafeEqual throws on length mismatch, so compare lengths first —
	// the length of the expected token is not itself a secret worth protecting.
	if (left.length !== right.length) return false
	return timingSafeEqual(left, right)
}

export function bearerAuth(expectedToken: string): RequestHandler {
	return (req, res, next) => {
		const header = req.header("authorization") ?? ""
		const [scheme, value] = header.split(" ")
		if (scheme !== "Bearer" || !value || !safeEqual(value, expectedToken)) {
			res.status(401).json({ error: "unauthorized" })
			return
		}
		next()
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mcp test auth`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/auth.ts mcp/test/auth.spec.ts
git commit -m "feat(mcp): add constant-time bearer token middleware"
```

---

### Task 5: Firestore recipe repository

**Files:**
- Create: `mcp/src/repository.ts`
- Test: `mcp/test/repository.spec.ts`
- Create: `mcp/test/emulator.ts`

**Interfaces:**
- Consumes: `Recipe`, `StoredRecipe`, `RecipeSummary` from `types.ts`; `recipeDocId` from `recipe-id.ts`.
- Produces a `RecipeRepository` class:
  - `constructor(db: Firestore)`
  - `getRecipe(id: string): Promise<{ id: string } & StoredRecipe | null>`
  - `listRecipes(opts: { category?: string; tag?: string; limit: number; cursor?: string }): Promise<{ recipes: RecipeSummary[]; nextCursor: string | null }>`
  - `createRecipe(recipe: Recipe): Promise<{ id: string }>` — throws `RecipeExistsError` if the derived ID is taken
  - `updateRecipe(id: string, patch: Partial<Recipe>): Promise<void>` — throws `RecipeNotFoundError` if absent
  - `searchByVector(queryEmbedding: number[], limit: number): Promise<Array<RecipeSummary & { distance: number }>>`
  - `export class RecipeExistsError extends Error`
  - `export class RecipeNotFoundError extends Error`

Tests run against the Firestore emulator. Start it with `firebase emulators:start --only firestore` in a separate terminal before running these tests, or the suite will hang trying to reach production Firestore.

- [ ] **Step 1: Create the emulator test helper**

Create `mcp/test/emulator.ts`:

```typescript
import { cert, deleteApp, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import type { App } from "firebase-admin/app"
import type { Firestore } from "firebase-admin/firestore"

// Pointing at the emulator must happen before getFirestore() is called.
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080"

let app: App | undefined

export function emulatorDb(): Firestore {
	app ??= initializeApp({ projectId: "veganflora-test" }, `test-${Date.now()}`)
	return getFirestore(app)
}

export async function clearRecipes(db: Firestore): Promise<void> {
	const snapshot = await db.collection("veganflora").doc("root").collection("recipies").get()
	await Promise.all(snapshot.docs.map((d) => d.ref.delete()))
}

export async function closeDb(): Promise<void> {
	if (app) await deleteApp(app)
	app = undefined
}
```

Remove the unused `cert` import if the linter flags it — it is not needed for emulator connections.

- [ ] **Step 2: Write the failing test**

Create `mcp/test/repository.spec.ts`:

```typescript
import type { Firestore } from "firebase-admin/firestore"

import { RecipeExistsError, RecipeNotFoundError, RecipeRepository } from "../src/repository.js"
import { clearRecipes, closeDb, emulatorDb } from "./emulator.js"

const sample = {
	title: "Linssoppa",
	size: "4 portioner",
	ingredients: [{ name: "röda linser", amount: "2", measure: "dl" }],
	text: "Koka linserna.",
	category: ["Soppor"],
	tags: ["snabbt"],
}

describe("RecipeRepository", () => {
	let db: Firestore
	let repo: RecipeRepository

	beforeAll(() => {
		db = emulatorDb()
		repo = new RecipeRepository(db)
	})

	beforeEach(async () => {
		await clearRecipes(db)
	})

	afterAll(async () => {
		await closeDb()
	})

	it("creates a recipe and returns its derived id", async () => {
		const { id } = await repo.createRecipe(sample)
		expect(id).toBe("Soppor\\Linssoppa")
	})

	it("reads back a created recipe", async () => {
		await repo.createRecipe(sample)
		const found = await repo.getRecipe("Soppor\\Linssoppa")
		expect(found?.title).toBe("Linssoppa")
		expect(found?.ingredients).toEqual(sample.ingredients)
	})

	it("returns null for a missing recipe", async () => {
		expect(await repo.getRecipe("Soppor\\Saknas")).toBeNull()
	})

	it("refuses to overwrite an existing recipe", async () => {
		await repo.createRecipe(sample)
		await expect(repo.createRecipe(sample)).rejects.toThrow(RecipeExistsError)
	})

	it("merges only the named fields on update", async () => {
		await repo.createRecipe(sample)
		await repo.updateRecipe("Soppor\\Linssoppa", { size: "6 portioner" })
		const found = await repo.getRecipe("Soppor\\Linssoppa")
		expect(found?.size).toBe("6 portioner")
		expect(found?.title).toBe("Linssoppa")
		expect(found?.ingredients).toEqual(sample.ingredients)
	})

	it("throws when updating a missing recipe", async () => {
		await expect(repo.updateRecipe("Soppor\\Saknas", { size: "1" })).rejects.toThrow(RecipeNotFoundError)
	})

	it("preserves the embedding field across an update", async () => {
		await repo.createRecipe(sample)
		const ref = db.collection("veganflora").doc("root").collection("recipies").doc("Soppor\\Linssoppa")
		await ref.update({ embeddingHash: "deadbeef" })
		await repo.updateRecipe("Soppor\\Linssoppa", { size: "8 portioner" })
		const after = await ref.get()
		expect(after.data()?.embeddingHash).toBe("deadbeef")
	})

	it("lists recipes filtered by tag", async () => {
		await repo.createRecipe(sample)
		await repo.createRecipe({ ...sample, title: "Ärtsoppa", tags: ["långkok"] })
		const { recipes } = await repo.listRecipes({ tag: "snabbt", limit: 10 })
		expect(recipes.map((r) => r.title)).toEqual(["Linssoppa"])
	})

	it("lists recipes filtered by category", async () => {
		await repo.createRecipe(sample)
		await repo.createRecipe({ ...sample, title: "Pannkakor", category: ["Efterrätter"] })
		const { recipes } = await repo.listRecipes({ category: "Soppor", limit: 10 })
		expect(recipes.map((r) => r.title)).toEqual(["Linssoppa"])
	})

	it("paginates with a cursor", async () => {
		await repo.createRecipe({ ...sample, title: "Alfa" })
		await repo.createRecipe({ ...sample, title: "Beta" })
		const first = await repo.listRecipes({ limit: 1 })
		expect(first.recipes).toHaveLength(1)
		expect(first.nextCursor).not.toBeNull()

		const second = await repo.listRecipes({ limit: 1, cursor: first.nextCursor! })
		expect(second.recipes).toHaveLength(1)
		expect(second.recipes[0].id).not.toBe(first.recipes[0].id)
	})

	it("returns a null cursor on the last page", async () => {
		await repo.createRecipe(sample)
		const { nextCursor } = await repo.listRecipes({ limit: 10 })
		expect(nextCursor).toBeNull()
	})
})
```

- [ ] **Step 3: Run test to verify it fails**

Start the emulator first, in a separate terminal:

```bash
firebase emulators:start --only firestore
```

Run: `pnpm --filter mcp test repository`
Expected: FAIL — `Cannot find module '../src/repository.js'`

- [ ] **Step 4: Write the minimal implementation**

Create `mcp/src/repository.ts`:

```typescript
import { FieldValue, type Firestore } from "firebase-admin/firestore"

import { recipeDocId } from "./recipe-id.js"
import type { Recipe, RecipeSummary, StoredRecipe } from "./types.js"

export class RecipeExistsError extends Error {}
export class RecipeNotFoundError extends Error {}

/** Fields a client may write. `embedding` and `embeddingHash` are absent on purpose. */
const WRITABLE_FIELDS = ["title", "size", "ingredients", "text", "category", "tags", "image"] as const

export class RecipeRepository {
	constructor(private readonly db: Firestore) {}

	private get collection() {
		return this.db.collection("veganflora").doc("root").collection("recipies")
	}

	async getRecipe(id: string): Promise<({ id: string } & StoredRecipe) | null> {
		const doc = await this.collection.doc(id).get()
		if (!doc.exists) return null
		return { id: doc.id, ...(doc.data() as StoredRecipe) }
	}

	async listRecipes(opts: {
		category?: string
		tag?: string
		limit: number
		cursor?: string
	}): Promise<{ recipes: RecipeSummary[]; nextCursor: string | null }> {
		let query = this.collection.orderBy("__name__").limit(opts.limit + 1)
		if (opts.category) query = query.where("category", "array-contains", opts.category)
		if (opts.tag) query = query.where("tags", "array-contains", opts.tag)
		if (opts.cursor) query = query.startAfter(opts.cursor)

		const snapshot = await query.get()
		const docs = snapshot.docs.slice(0, opts.limit)
		const hasMore = snapshot.docs.length > opts.limit

		return {
			recipes: docs.map((d) => {
				const data = d.data() as StoredRecipe
				return { id: d.id, title: data.title, category: data.category ?? [], tags: data.tags ?? [] }
			}),
			nextCursor: hasMore ? docs[docs.length - 1].id : null,
		}
	}

	async createRecipe(recipe: Recipe): Promise<{ id: string }> {
		const id = recipeDocId(recipe.category, recipe.title)
		const ref = this.collection.doc(id)
		const existing = await ref.get()
		if (existing.exists) {
			throw new RecipeExistsError(`A recipe already exists at "${id}". Use update_recipe to change it.`)
		}
		await ref.set(this.writableOnly(recipe))
		return { id }
	}

	async updateRecipe(id: string, patch: Partial<Recipe>): Promise<void> {
		const ref = this.collection.doc(id)
		const existing = await ref.get()
		if (!existing.exists) throw new RecipeNotFoundError(`No recipe with id "${id}".`)

		const fields = this.writableOnly(patch)
		if (Object.keys(fields).length === 0) return
		// update() merges: fields not named here keep their stored values,
		// including embedding and embeddingHash which the trigger owns.
		await ref.update(fields)
	}

	async searchByVector(
		queryEmbedding: number[],
		limit: number,
	): Promise<Array<RecipeSummary & { distance: number }>> {
		const snapshot = await this.collection
			.findNearest({
				vectorField: "embedding",
				queryVector: queryEmbedding,
				limit,
				distanceMeasure: "COSINE",
				distanceResultField: "vector_distance",
			})
			.get()

		return snapshot.docs.map((d) => {
			const data = d.data() as StoredRecipe & { vector_distance: number }
			return {
				id: d.id,
				title: data.title,
				category: data.category ?? [],
				tags: data.tags ?? [],
				distance: data.vector_distance,
			}
		})
	}

	private writableOnly(input: Partial<Recipe>): Record<string, unknown> {
		const out: Record<string, unknown> = {}
		for (const key of WRITABLE_FIELDS) {
			if (input[key] !== undefined) out[key] = input[key]
		}
		return out
	}
}
```

`FieldValue` may be unused after implementation — remove the import if so.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter mcp test repository`
Expected: PASS, 11 tests.

`searchByVector` has no test here — it needs a vector index the emulator does not provide. It is covered by the manual verification in Task 9.

- [ ] **Step 6: Commit**

```bash
git add mcp/src/repository.ts mcp/test/repository.spec.ts mcp/test/emulator.ts
git commit -m "feat(mcp): add firestore recipe repository"
```

---

### Task 6: Embedding client and MCP tool registration

**Files:**
- Create: `mcp/src/embeddings.ts`
- Create: `mcp/src/tools.ts`
- Test: `mcp/test/tools.spec.ts`

**Interfaces:**
- Consumes: `RecipeRepository`, `RecipeExistsError`, `RecipeNotFoundError` from `repository.ts`; `Recipe` from `types.ts`.
- Produces:
  - `interface Embedder { embed(text: string): Promise<number[]> }`
  - `class GeminiEmbedder implements Embedder` — `constructor(apiKey: string)`
  - `function registerRecipeTools(server: McpServer, repo: RecipeRepository, embedder: Embedder): void`

Five tools, no more: `search_recipes`, `get_recipe`, `list_recipes`, `create_recipe`, `update_recipe`. Do not add `delete_recipe`.

- [ ] **Step 1: Create the embedding client**

Create `mcp/src/embeddings.ts`:

```typescript
import { GoogleGenAI } from "@google/genai"

export const EMBEDDING_MODEL = "gemini-embedding-001"
export const EMBEDDING_DIMENSIONS = 768

export interface Embedder {
	embed(text: string): Promise<number[]>
}

export class GeminiEmbedder implements Embedder {
	private readonly client: GoogleGenAI

	constructor(apiKey: string) {
		this.client = new GoogleGenAI({ apiKey })
	}

	async embed(text: string): Promise<number[]> {
		const response = await this.client.models.embedContent({
			model: EMBEDDING_MODEL,
			contents: text,
			config: { outputDimensionality: EMBEDDING_DIMENSIONS },
		})
		const values = response.embeddings?.[0]?.values
		if (!values) throw new Error("Gemini returned no embedding values")
		return values
	}
}
```

- [ ] **Step 2: Write the failing test**

Create `mcp/test/tools.spec.ts`. It drives the tools through an in-memory MCP client so the registration, schemas, and handlers are all exercised together.

```typescript
import { Client } from "@modelcontextprotocol/client"
import { InMemoryTransport } from "@modelcontextprotocol/server/inMemory.js"
import { McpServer } from "@modelcontextprotocol/server"
import type { Firestore } from "firebase-admin/firestore"

import { RecipeRepository } from "../src/repository.js"
import { registerRecipeTools } from "../src/tools.js"
import type { Embedder } from "../src/embeddings.js"
import { clearRecipes, closeDb, emulatorDb } from "./emulator.js"

const stubEmbedder: Embedder = {
	embed: async () => new Array(768).fill(0.1),
}

const sample = {
	title: "Linssoppa",
	size: "4 portioner",
	ingredients: [{ name: "röda linser" }],
	text: "Koka linserna.",
	category: ["Soppor"],
	tags: ["snabbt"],
}

async function connectedClient(repo: RecipeRepository) {
	const server = new McpServer({ name: "veganflora-recipes", version: "1.0.0" })
	registerRecipeTools(server, repo, stubEmbedder)

	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
	const client = new Client({ name: "test", version: "1.0.0" })
	await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
	return client
}

describe("recipe tools", () => {
	let db: Firestore
	let repo: RecipeRepository
	let client: Awaited<ReturnType<typeof connectedClient>>

	beforeAll(() => {
		db = emulatorDb()
		repo = new RecipeRepository(db)
	})

	beforeEach(async () => {
		await clearRecipes(db)
		client = await connectedClient(repo)
	})

	afterAll(async () => {
		await closeDb()
	})

	it("exposes exactly the five expected tools", async () => {
		const { tools } = await client.listTools()
		expect(tools.map((t) => t.name).sort()).toEqual([
			"create_recipe",
			"get_recipe",
			"list_recipes",
			"search_recipes",
			"update_recipe",
		])
	})

	it("does not expose a delete tool", async () => {
		const { tools } = await client.listTools()
		expect(tools.map((t) => t.name)).not.toContain("delete_recipe")
	})

	it("creates a recipe and returns its id", async () => {
		const result = await client.callTool({ name: "create_recipe", arguments: sample })
		expect(result.isError).toBeFalsy()
		expect(result.structuredContent).toMatchObject({ id: "Soppor\\Linssoppa" })
	})

	it("returns an error result when creating a duplicate", async () => {
		await client.callTool({ name: "create_recipe", arguments: sample })
		const result = await client.callTool({ name: "create_recipe", arguments: sample })
		expect(result.isError).toBe(true)
		expect(JSON.stringify(result.content)).toContain("already exists")
	})

	it("gets a recipe by id", async () => {
		await client.callTool({ name: "create_recipe", arguments: sample })
		const result = await client.callTool({ name: "get_recipe", arguments: { id: "Soppor\\Linssoppa" } })
		expect(result.structuredContent).toMatchObject({ title: "Linssoppa" })
	})

	it("returns an error result for a missing recipe", async () => {
		const result = await client.callTool({ name: "get_recipe", arguments: { id: "Soppor\\Saknas" } })
		expect(result.isError).toBe(true)
	})

	it("updates only the supplied fields", async () => {
		await client.callTool({ name: "create_recipe", arguments: sample })
		const result = await client.callTool({
			name: "update_recipe",
			arguments: { id: "Soppor\\Linssoppa", size: "6 portioner" },
		})
		expect(result.isError).toBeFalsy()
		const after = await repo.getRecipe("Soppor\\Linssoppa")
		expect(after?.size).toBe("6 portioner")
		expect(after?.title).toBe("Linssoppa")
	})

	it("rejects an update that tries to set the embedding field", async () => {
		await client.callTool({ name: "create_recipe", arguments: sample })
		const result = await client.callTool({
			name: "update_recipe",
			arguments: { id: "Soppor\\Linssoppa", embedding: [1, 2, 3] },
		})
		expect(result.isError).toBe(true)
	})

	it("lists recipes", async () => {
		await client.callTool({ name: "create_recipe", arguments: sample })
		const result = await client.callTool({ name: "list_recipes", arguments: {} })
		expect(JSON.stringify(result.structuredContent)).toContain("Linssoppa")
	})
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter mcp test tools`
Expected: FAIL — `Cannot find module '../src/tools.js'`

If the import of `InMemoryTransport` or `@modelcontextprotocol/client` fails to resolve, check the installed package's exports and adjust the import path. The v2 SDK splits client and server into separate packages; add `@modelcontextprotocol/client` to `devDependencies` if it is not already resolvable.

- [ ] **Step 4: Write the minimal implementation**

Create `mcp/src/tools.ts`:

```typescript
import type { McpServer } from "@modelcontextprotocol/server"
import * as z from "zod/v4"

import type { Embedder } from "./embeddings.js"
import { RecipeExistsError, RecipeNotFoundError, type RecipeRepository } from "./repository.js"

const ingredientSchema = z.object({
	name: z.string().describe("Ingredient name in Swedish, without brand names"),
	amount: z.string().optional().describe("Quantity, e.g. \"2\""),
	measure: z.string().optional().describe("Swedish unit, e.g. dl, tsk, msk, gram"),
})

const recipeFields = {
	title: z.string().describe("Swedish recipe name"),
	size: z.string().describe("Portion size, e.g. \"6 portioner\""),
	ingredients: z.array(ingredientSchema),
	text: z.string().describe("Markdown step-by-step instructions"),
	category: z.array(z.string()).describe("Hierarchical category path, e.g. [\"Soppor\"]"),
	tags: z.array(z.string()),
	image: z.string().optional(),
}

function errorResult(message: string) {
	return { content: [{ type: "text" as const, text: message }], isError: true }
}

function okResult(payload: unknown) {
	return {
		content: [{ type: "text" as const, text: JSON.stringify(payload) }],
		structuredContent: payload as Record<string, unknown>,
	}
}

export function registerRecipeTools(server: McpServer, repo: RecipeRepository, embedder: Embedder): void {
	server.registerTool(
		"search_recipes",
		{
			description:
				"Semantic search over the recipe collection. Best for descriptive queries " +
				"(\"something warming for a cold evening\"). For exact ingredient or tag " +
				"membership, prefer list_recipes with a tag or category filter.",
			inputSchema: z.object({
				query: z.string().describe("Natural language description of what to cook"),
				limit: z.number().int().min(1).max(20).optional(),
			}),
		},
		async ({ query, limit }) => {
			try {
				const vector = await embedder.embed(query)
				const hits = await repo.searchByVector(vector, limit ?? 5)
				return okResult({ results: hits })
			} catch (err) {
				return errorResult(`Search failed: ${(err as Error).message}`)
			}
		},
	)

	server.registerTool(
		"get_recipe",
		{
			description: "Fetch one full recipe by its document id.",
			inputSchema: z.object({ id: z.string() }),
		},
		async ({ id }) => {
			try {
				const recipe = await repo.getRecipe(id)
				if (!recipe) return errorResult(`No recipe with id "${id}".`)
				const { embedding, embeddingHash, ...rest } = recipe
				return okResult(rest)
			} catch (err) {
				return errorResult(`Lookup failed: ${(err as Error).message}`)
			}
		},
	)

	server.registerTool(
		"list_recipes",
		{
			description: "List recipes, optionally filtered by exact category or tag. Paginated.",
			inputSchema: z.object({
				category: z.string().optional(),
				tag: z.string().optional(),
				limit: z.number().int().min(1).max(50).optional(),
				cursor: z.string().optional(),
			}),
		},
		async ({ category, tag, limit, cursor }) => {
			try {
				const page = await repo.listRecipes({ category, tag, limit: limit ?? 20, cursor })
				return okResult(page)
			} catch (err) {
				return errorResult(`List failed: ${(err as Error).message}`)
			}
		},
	)

	server.registerTool(
		"create_recipe",
		{
			description:
				"Create a new recipe. The document id is derived from category and title; " +
				"creation fails if that id is already taken.",
			inputSchema: z.object(recipeFields),
		},
		async (recipe) => {
			try {
				const { id } = await repo.createRecipe(recipe)
				return okResult({ id })
			} catch (err) {
				if (err instanceof RecipeExistsError) return errorResult(err.message)
				return errorResult(`Create failed: ${(err as Error).message}`)
			}
		},
	)

	server.registerTool(
		"update_recipe",
		{
			description:
				"Update named fields of an existing recipe. Omitted fields are left unchanged. " +
				"Cannot delete a recipe and cannot write search embeddings.",
			inputSchema: z.object({
				id: z.string(),
				title: recipeFields.title.optional(),
				size: recipeFields.size.optional(),
				ingredients: recipeFields.ingredients.optional(),
				text: recipeFields.text.optional(),
				category: recipeFields.category.optional(),
				tags: recipeFields.tags.optional(),
				image: recipeFields.image,
			}),
		},
		async ({ id, ...patch }) => {
			try {
				await repo.updateRecipe(id, patch)
				return okResult({ id, updated: Object.keys(patch) })
			} catch (err) {
				if (err instanceof RecipeNotFoundError) return errorResult(err.message)
				return errorResult(`Update failed: ${(err as Error).message}`)
			}
		},
	)
}
```

The "rejects an update that tries to set the embedding field" test passes because Zod strips unknown keys and the SDK rejects unrecognised properties against the generated JSON Schema. If that test fails because the extra key is silently ignored rather than rejected, add `.strict()` to the `update_recipe` input schema object.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter mcp test tools`
Expected: PASS, 9 tests.

- [ ] **Step 6: Run the whole suite**

Run: `pnpm --filter mcp test`
Expected: PASS — 31 tests across four suites.

- [ ] **Step 7: Commit**

```bash
git add mcp/src/embeddings.ts mcp/src/tools.ts mcp/test/tools.spec.ts
git commit -m "feat(mcp): add gemini embedder and recipe tools"
```

---

### Task 7: HTTP server entrypoint

**Files:**
- Create: `mcp/src/server.ts`
- Test: `mcp/test/server.spec.ts`

**Interfaces:**
- Consumes: `bearerAuth`, `RecipeRepository`, `registerRecipeTools`, `GeminiEmbedder`.
- Produces: `function createApp(deps: { repo: RecipeRepository; embedder: Embedder; token: string }): express.Express` and a module-level bootstrap that reads env vars and listens.

`createApp` must be exported separately from the bootstrap so tests can build an app without binding a port or requiring real credentials.

- [ ] **Step 1: Write the failing test**

Create `mcp/test/server.spec.ts`:

```typescript
import request from "supertest"
import type { Firestore } from "firebase-admin/firestore"

import { RecipeRepository } from "../src/repository.js"
import { createApp } from "../src/server.js"
import type { Embedder } from "../src/embeddings.js"
import { closeDb, emulatorDb } from "./emulator.js"

const stubEmbedder: Embedder = { embed: async () => new Array(768).fill(0.1) }

describe("createApp", () => {
	let db: Firestore
	let app: ReturnType<typeof createApp>

	beforeAll(() => {
		db = emulatorDb()
		app = createApp({ repo: new RecipeRepository(db), embedder: stubEmbedder, token: "test-token" })
	})

	afterAll(async () => {
		await closeDb()
	})

	it("rejects an unauthenticated initialize request", async () => {
		const res = await request(app)
			.post("/mcp")
			.send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })
		expect(res.status).toBe(401)
	})

	it("accepts an authenticated initialize request", async () => {
		const res = await request(app)
			.post("/mcp")
			.set("Authorization", "Bearer test-token")
			.set("Accept", "application/json, text/event-stream")
			.send({
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: {
					protocolVersion: "2025-06-18",
					capabilities: {},
					clientInfo: { name: "test", version: "1.0.0" },
				},
			})
		expect(res.status).toBe(200)
	})

	it("serves an unauthenticated health check", async () => {
		const res = await request(app).get("/health")
		expect(res.status).toBe(200)
		expect(res.body).toEqual({ status: "ok" })
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mcp test server`
Expected: FAIL — `Cannot find module '../src/server.js'`

- [ ] **Step 3: Write the minimal implementation**

Create `mcp/src/server.ts`:

```typescript
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node"
import { McpServer } from "@modelcontextprotocol/server"
import express from "express"
import { initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

import { bearerAuth } from "./auth.js"
import { GeminiEmbedder, type Embedder } from "./embeddings.js"
import { RecipeRepository } from "./repository.js"
import { registerRecipeTools } from "./tools.js"

export function createApp(deps: { repo: RecipeRepository; embedder: Embedder; token: string }) {
	const app = express()
	app.use(express.json({ limit: "1mb" }))

	// Health check sits before auth so uptime probes need no credential.
	app.get("/health", (_req, res) => {
		res.json({ status: "ok" })
	})

	app.use("/mcp", bearerAuth(deps.token))

	app.post("/mcp", async (req, res) => {
		// Stateless: a fresh server and transport per request. No session id,
		// so nothing to keep between calls and no cross-request state to leak.
		const server = new McpServer({ name: "veganflora-recipes", version: "1.0.0" })
		registerRecipeTools(server, deps.repo, deps.embedder)

		const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
		res.on("close", () => {
			void transport.close()
			void server.close()
		})

		await server.connect(transport)
		await transport.handleRequest(req, res, req.body)
	})

	return app
}

function requireEnv(name: string): string {
	const value = process.env[name]
	if (!value) throw new Error(`Missing required environment variable ${name}`)
	return value
}

// Bootstrap only when run directly, so importing this module in tests is side-effect free.
if (process.argv[1]?.endsWith("server.js")) {
	initializeApp()
	const app = createApp({
		repo: new RecipeRepository(getFirestore()),
		embedder: new GeminiEmbedder(requireEnv("GEMINI_API_KEY")),
		token: requireEnv("MCP_BEARER_TOKEN"),
	})
	const port = Number(process.env.PORT ?? 8080)
	app.listen(port, () => {
		console.log(`veganflora recipes MCP server listening on :${port}`)
	})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mcp test server`
Expected: PASS, 3 tests.

If the authenticated initialize returns 406, the transport is rejecting the `Accept` header — the test already sets `application/json, text/event-stream`, which is what the Streamable HTTP spec requires. If it returns 400, log `res.body` and check the `protocolVersion` against the installed SDK's supported versions.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/server.ts mcp/test/server.spec.ts
git commit -m "feat(mcp): add authenticated streamable http entrypoint"
```

---

### Task 8: Embedding trigger in `functions/`

**Files:**
- Create: `functions/src/embedding.ts`
- Modify: `functions/src/index.ts` (append the export near the existing `prefillUpdate`, around line 212)

**Interfaces:**
- Consumes: nothing from `mcp/` — `functions/` is a separate deployable and must not import across the workspace boundary. The `embeddingText` and `contentHash` logic is duplicated here deliberately; both copies are ~10 lines and a shared package is not worth the deploy complexity.
- Produces: `export const recipeEmbeddingUpdate` — a Firestore `onDocumentWritten` trigger.

**The hash guard is load-bearing.** This trigger writes back to the same document that triggered it, which re-fires the trigger. Without the early return on an unchanged hash, it recurses until Firebase throttles it and burns Gemini quota. The existing `prefillUpdate` at `functions/src/index.ts:252` has exactly this write-back shape — study it, and note that our guard is what it lacks.

- [ ] **Step 1: Create the embedding module**

Create `functions/src/embedding.ts`:

```typescript
import { createHash } from "node:crypto"

import { GoogleGenAI } from "@google/genai"

export const EMBEDDING_MODEL = "gemini-embedding-001"
export const EMBEDDING_DIMENSIONS = 768

type IngredientLike = { name: string }

export function embeddingText(recipe: {
	title: string
	ingredients: IngredientLike[]
	text: string
}): string {
	const names = (recipe.ingredients ?? []).map((i) => i.name).join(", ")
	return `${recipe.title}\n${names}\n${recipe.text}`
}

export function contentHash(text: string): string {
	return createHash("sha256").update(text, "utf8").digest("hex")
}

export async function embed(apiKey: string, text: string): Promise<number[]> {
	const client = new GoogleGenAI({ apiKey })
	const response = await client.models.embedContent({
		model: EMBEDDING_MODEL,
		contents: text,
		config: { outputDimensionality: EMBEDDING_DIMENSIONS },
	})
	const values = response.embeddings?.[0]?.values
	if (!values) throw new Error("Gemini returned no embedding values")
	return values
}
```

- [ ] **Step 2: Register the trigger**

Append to `functions/src/index.ts`, after the existing `prefillUpdate` export:

```typescript
import { FieldValue } from "firebase-admin/firestore"

import { contentHash, embed, embeddingText } from "./embedding.js"

export const recipeEmbeddingUpdate = onDocumentWritten(
	{
		document: "/veganflora/root/recipies/{id}",
		timeoutSeconds,
		region,
		secrets,
	},
	async ({ params, data }) => {
		const after = data?.after
		if (!after?.exists) return logger.info(`${params.id}: deleted, nothing to embed`)

		const recipe = after.data() as {
			title?: string
			ingredients?: { name: string }[]
			text?: string
			embeddingHash?: string
		}
		if (!recipe.title || !recipe.text) {
			return logger.warn(`${params.id}: missing title or text, skipping embedding`)
		}

		const text = embeddingText({
			title: recipe.title,
			ingredients: recipe.ingredients ?? [],
			text: recipe.text,
		})
		const hash = contentHash(text)

		// REQUIRED: this write-back retriggers this same function. Without this
		// early return the trigger recurses indefinitely.
		if (recipe.embeddingHash === hash) {
			return logger.info(`${params.id}: embedding up to date`)
		}

		try {
			const vector = await embed(apiKey.value(), text)
			await after.ref.update({
				embedding: FieldValue.vector(vector),
				embeddingHash: hash,
			})
			logger.info(`${params.id}: embedding updated`)
		} catch (err) {
			// Swallowed on purpose: a Gemini outage must not block recipe writes.
			// scripts:backfill recovers anything missed here.
			logger.error(`${params.id}: embedding failed`, err)
		}
	},
)
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter functions typecheck`
Expected: passes.

If `FieldValue.vector` is not found, the installed `firebase-admin` is too old for vector support — check the version resolves to 13.x and not an older pin.

- [ ] **Step 4: Verify the guard by inspection**

Re-read the trigger and confirm all three properties hold. This cannot be tested against the emulator (no vector index), so the review is the check:

1. The hash is computed from the same text that gets embedded.
2. The early return happens *before* any Gemini call.
3. The write-back sets `embeddingHash` in the same `update()` as `embedding` — if only the vector were written, the next invocation would recompute forever.

- [ ] **Step 5: Commit**

```bash
git add functions/src/embedding.ts functions/src/index.ts
git commit -m "feat(functions): embed recipes on write for vector search"
```

---

### Task 9: Backfill script and vector index

**Files:**
- Create: `mcp/scripts/backfill-embeddings.ts`
- Create: `mcp/README.md`

**Interfaces:**
- Consumes: `embeddingText`, `contentHash` from `mcp/src/embedding-content.ts`; `GeminiEmbedder` from `mcp/src/embeddings.ts`.
- Produces: a runnable script, and the documented `gcloud` command that creates the vector index.

The backfill exists because the ~50 existing recipes predate the trigger and will never be written again on their own. Without it, search returns nothing.

- [ ] **Step 1: Write the backfill script**

Create `mcp/scripts/backfill-embeddings.ts`:

```typescript
import { initializeApp } from "firebase-admin/app"
import { FieldValue, getFirestore } from "firebase-admin/firestore"

import { contentHash, embeddingText } from "../src/embedding-content.js"
import { GeminiEmbedder } from "../src/embeddings.js"
import type { StoredRecipe } from "../src/types.js"

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) throw new Error("Missing GEMINI_API_KEY")

const dryRun = process.argv.includes("--dry-run")

initializeApp()
const db = getFirestore()
const embedder = new GeminiEmbedder(apiKey)

async function main() {
	const snapshot = await db.collection("veganflora").doc("root").collection("recipies").get()
	console.log(`Found ${snapshot.size} recipes`)

	let embedded = 0
	let skipped = 0

	for (const doc of snapshot.docs) {
		const recipe = doc.data() as StoredRecipe
		if (!recipe.title || !recipe.text) {
			console.warn(`SKIP ${doc.id}: missing title or text`)
			skipped++
			continue
		}

		const text = embeddingText({
			title: recipe.title,
			ingredients: recipe.ingredients ?? [],
			text: recipe.text,
		})
		const hash = contentHash(text)

		if (recipe.embeddingHash === hash) {
			skipped++
			continue
		}

		if (dryRun) {
			console.log(`WOULD EMBED ${doc.id}`)
			embedded++
			continue
		}

		const vector = await embedder.embed(text)
		await doc.ref.update({ embedding: FieldValue.vector(vector), embeddingHash: hash })
		console.log(`EMBEDDED ${doc.id}`)
		embedded++
	}

	console.log(`Done. embedded=${embedded} skipped=${skipped}`)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
```

- [ ] **Step 2: Dry run against production**

Run: `GEMINI_API_KEY=<key> pnpm --filter mcp script:backfill -- --dry-run`
Expected: lists every recipe as `WOULD EMBED`, writes nothing. Confirm the count roughly matches the ~50 known recipes.

- [ ] **Step 3: Create the vector index**

`findNearest` returns `FAILED_PRECONDITION` without a matching index. Run:

```bash
gcloud firestore indexes composite create --collection-group=recipies --query-scope=COLLECTION --field-config=vector-config='{"dimension":"768","flat":"{}"}',field-path=embedding --project=veganflora
```

Index creation is asynchronous. Check readiness with:

```bash
gcloud firestore indexes composite list --project=veganflora
```

Wait for state `READY` before the next step.

- [ ] **Step 4: Run the real backfill**

Run: `GEMINI_API_KEY=<key> pnpm --filter mcp script:backfill`
Expected: `EMBEDDED` for each recipe, ending with a count.

Then re-run the same command. Expected: `embedded=0 skipped=<n>` — this proves idempotency, which is what makes the script safe to re-run after a partial failure.

- [ ] **Step 5: Write the README**

Create `mcp/README.md` documenting: required env vars (`GEMINI_API_KEY`, `MCP_BEARER_TOKEN`, optional `PORT`), how to run locally, the vector index command from Step 3, the backfill command, and an explicit note that the bearer token is the only access control and must be long, random, and rotatable.

- [ ] **Step 6: Commit**

```bash
git add mcp/scripts/backfill-embeddings.ts mcp/README.md
git commit -m "feat(mcp): add embedding backfill script and setup docs"
```

---

### Task 10: End-to-end verification

**Files:**
- Modify: `mcp/README.md` (append the verified test plan)

**Interfaces:**
- Consumes: everything above.
- Produces: a recorded manual test plan with real results.

Vector search cannot be tested against the emulator, so this task is where `search_recipes` is proven to work at all.

- [ ] **Step 1: Full local check**

Run each and confirm it passes:

```bash
pnpm --filter mcp check
pnpm --filter mcp typecheck
pnpm --filter mcp test
pnpm --filter functions typecheck
```

- [ ] **Step 2: Deploy the trigger**

Run: `pnpm --filter functions deploy`
Expected: `recipeEmbeddingUpdate` deploys to `europe-north1` alongside the existing functions.

- [ ] **Step 3: Verify the trigger does not recurse**

This is the highest-risk behavior in the whole change. Edit any recipe in the webapp, then:

```bash
firebase functions:log --only recipeEmbeddingUpdate
```

Expected: one `embedding updated` line, then one `embedding up to date` line from the write-back, then silence. If lines keep appearing, the hash guard is broken — stop and fix Task 8 before continuing.

- [ ] **Step 4: Start the server and exercise it**

```bash
GEMINI_API_KEY=<key> MCP_BEARER_TOKEN=<token> pnpm --filter mcp start
```

Confirm auth is enforced:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8080/mcp -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expected: `401`.

- [ ] **Step 5: Verify semantic search returns real results**

With the server running, call `search_recipes` with a descriptive Swedish query such as "något värmande till en kall kväll". Expected: ranked recipes with distances, not an empty list.

An empty result means either the vector index is not `READY` or the backfill did not run. A `FAILED_PRECONDITION` error means the index is missing.

Also record what a deliberately lexical query does — for example "recept med kikärtor". Per the spec, this is the known weak spot of vector search; note the actual quality in the README so the tradeoff is documented from evidence rather than prediction.

- [ ] **Step 6: Verify a write round-trip**

Call `create_recipe` with a throwaway test recipe. Then confirm:

1. `get_recipe` returns it.
2. `firebase functions:log` shows the trigger embedded it.
3. `search_recipes` with a query matching its content finds it.
4. Calling `create_recipe` again with the same title and category returns an error, not a silent overwrite.

Delete the test recipe through the webapp afterwards — the server has no delete tool by design.

- [ ] **Step 7: Record results and commit**

Append the executed test plan and its actual outcomes to `mcp/README.md`.

```bash
git add mcp/README.md
git commit -m "docs(mcp): record end-to-end verification results"
```

---

## Deployment note

This plan produces a server that runs locally and is verified locally. Hosting it (Cloud Run service, secret wiring for `MCP_BEARER_TOKEN`, and pointing the consuming harness at the deployed URL) is deliberately not covered — the spec fixes the transport and auth design but not the hosting target, and Cloud Run configuration is a separate change with its own review. Task 10 Step 4 proves the server works; deploying it is the follow-up.
