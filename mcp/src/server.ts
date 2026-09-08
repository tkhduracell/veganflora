import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node"
import { McpServer } from "@modelcontextprotocol/server"
import express from "express"
import { initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

import { bearerAuth } from "./auth.js"
import { type Embedder, GeminiEmbedder } from "./embeddings.js"
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
