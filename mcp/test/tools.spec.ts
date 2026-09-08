import { Client } from "@modelcontextprotocol/client"
import { InMemoryTransport, McpServer } from "@modelcontextprotocol/server"
import { FieldValue, type Firestore } from "firebase-admin/firestore"

import type { Embedder } from "../src/embeddings.js"
import { RecipeRepository } from "../src/repository.js"
import { registerRecipeTools } from "../src/tools.js"
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
	let client: Client

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

	it("never leaks the embedding fields through get_recipe", async () => {
		await client.callTool({ name: "create_recipe", arguments: sample })
		const ref = db.collection("veganflora").doc("root").collection("recipies").doc("Soppor\\Linssoppa")
		await ref.update({ embeddingHash: "deadbeef" })
		const result = await client.callTool({ name: "get_recipe", arguments: { id: "Soppor\\Linssoppa" } })
		expect(JSON.stringify(result.structuredContent)).not.toContain("deadbeef")
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
		const after = await repo.getRecipe("Soppor\\Linssoppa")
		expect(after?.embedding).toBeUndefined()
	})

	it("lists recipes", async () => {
		await client.callTool({ name: "create_recipe", arguments: sample })
		const result = await client.callTool({ name: "list_recipes", arguments: {} })
		expect(JSON.stringify(result.structuredContent)).toContain("Linssoppa")
	})

	it("ranks search hits by vector distance", async () => {
		// The emulator serves findNearest without a vector index (production needs
		// one), so the ranking itself is exercised here with hand-written vectors.
		const col = db.collection("veganflora").doc("root").collection("recipies")
		const near = new Array(768).fill(0.1)
		const far = new Array(768).fill(0.1)
		far[0] = -5

		await col.doc("Soppor\\Naera").set({
			title: "Nära", size: "4", ingredients: [], text: "x", category: ["Soppor"], tags: [],
			embedding: FieldValue.vector(near),
		})
		await col.doc("Soppor\\Fjaerran").set({
			title: "Fjärran", size: "4", ingredients: [], text: "x", category: ["Soppor"], tags: [],
			embedding: FieldValue.vector(far),
		})

		const result = await client.callTool({ name: "search_recipes", arguments: { query: "värmande soppa" } })
		expect(result.isError).toBeFalsy()

		const { results } = result.structuredContent as { results: Array<{ title: string; distance: number }> }
		expect(results.map((r) => r.title)).toEqual(["Nära", "Fjärran"])
		expect(results[0].distance).toBeLessThan(results[1].distance)
	})

	it("propagates an embedder failure as an error result", async () => {
		const server = new McpServer({ name: "veganflora-recipes", version: "1.0.0" })
		registerRecipeTools(server, repo, {
			embed: async () => {
				throw new Error("gemini is down")
			},
		})
		const [ct, st] = InMemoryTransport.createLinkedPair()
		const failing = new Client({ name: "test", version: "1.0.0" })
		await Promise.all([failing.connect(ct), server.connect(st)])

		const result = await failing.callTool({ name: "search_recipes", arguments: { query: "soppa" } })
		expect(result.isError).toBe(true)
		expect(JSON.stringify(result.content)).toContain("gemini is down")
	})
})
