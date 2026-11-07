import {
	getOAuthProtectedResourceMetadataUrl,
	mcpAuthMetadataRouter,
	requireBearerAuth,
} from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import {
	McpServer,
	type OAuthTokenVerifier,
} from "@modelcontextprotocol/server";
import express from "express";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { type Embedder, GeminiEmbedder } from "./embeddings.js";
import {
	GOOGLE_OAUTH_METADATA,
	GOOGLE_SCOPES,
	GoogleTokenVerifier,
	StaticOrGoogleVerifier,
} from "./google-auth.js";
import { RecipeRepository } from "./repository.js";
import { registerRecipeTools } from "./tools.js";

export function createApp(deps: {
	repo: RecipeRepository;
	embedder: Embedder;
	verifier: OAuthTokenVerifier;
	// Public URL of the /mcp endpoint; the OAuth resource identifier clients see.
	publicUrl: URL;
}) {
	const app = express();
	app.use(express.json({ limit: "1mb" }));

	// Health check sits before auth so uptime probes need no credential.
	app.get("/health", (_req, res) => {
		res.json({ status: "ok" });
	});

	// RFC 9728 discovery: tells MCP clients that Google is the authorization server.
	app.use(
		mcpAuthMetadataRouter({
			oauthMetadata: GOOGLE_OAUTH_METADATA,
			resourceServerUrl: deps.publicUrl,
			scopesSupported: GOOGLE_SCOPES,
			resourceName: "Veganflora recipes",
		}),
	);

	app.use(
		"/mcp",
		requireBearerAuth({
			verifier: deps.verifier,
			resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(deps.publicUrl),
		}),
	);

	app.post("/mcp", async (req, res) => {
		// Stateless: a fresh server and transport per request. No session id,
		// so nothing to keep between calls and no cross-request state to leak.
		const server = new McpServer({
			name: "veganflora-recipes",
			version: "1.0.0",
		});
		registerRecipeTools(server, deps.repo, deps.embedder);

		const transport = new NodeStreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
		});
		res.on("close", () => {
			void transport.close();
			void server.close();
		});

		await server.connect(transport);
		await transport.handleRequest(req, res, req.body);
	});

	return app;
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required environment variable ${name}`);
	return value;
}

// Bootstrap only when run directly, so importing this module in tests is side-effect free.
if (process.argv[1]?.endsWith("server.js")) {
	initializeApp();
	const list = (name: string) =>
		(process.env[name] ?? "")
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean);
	const clientIds = list("GOOGLE_OAUTH_CLIENT_IDS");
	const google =
		clientIds.length > 0
			? new GoogleTokenVerifier({
					clientIds,
					allowedEmails: list("MCP_ALLOWED_EMAILS"),
				})
			: undefined;
	const staticToken = process.env.MCP_BEARER_TOKEN || undefined;
	if (!google && !staticToken) {
		throw new Error("Set GOOGLE_OAUTH_CLIENT_IDS and/or MCP_BEARER_TOKEN");
	}
	const app = createApp({
		repo: new RecipeRepository(getFirestore()),
		embedder: new GeminiEmbedder(requireEnv("GEMINI_API_KEY")),
		verifier: new StaticOrGoogleVerifier(staticToken, google),
		publicUrl: new URL(requireEnv("MCP_PUBLIC_URL")),
	});
	const port = Number(process.env.PORT ?? 8080);
	app.listen(port, () => {
		console.log(`veganflora recipes MCP server listening on :${port}`);
	});
}
