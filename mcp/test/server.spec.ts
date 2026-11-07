import type { Firestore } from "firebase-admin/firestore";
import request from "supertest";

import type { Embedder } from "../src/embeddings.js";
import { StaticOrGoogleVerifier } from "../src/google-auth.js";
import { RecipeRepository } from "../src/repository.js";
import { createApp } from "../src/server.js";
import { closeDb, emulatorDb } from "./emulator.js";

const stubEmbedder: Embedder = { embed: async () => new Array(768).fill(0.1) };

describe("createApp", () => {
	let db: Firestore;
	let app: ReturnType<typeof createApp>;

	beforeAll(() => {
		db = emulatorDb();
		app = createApp({
			repo: new RecipeRepository(db),
			embedder: stubEmbedder,
			verifier: new StaticOrGoogleVerifier("test-token", undefined),
			publicUrl: new URL("https://mcp.example.com/mcp"),
		});
	});

	it("advertises Google as the authorization server", async () => {
		const res = await request(app).get(
			"/.well-known/oauth-protected-resource/mcp",
		);
		expect(res.status).toBe(200);
		expect(res.body.resource).toBe("https://mcp.example.com/mcp");
		expect(res.body.authorization_servers).toEqual([
			"https://accounts.google.com",
		]);
	});

	it("points unauthenticated clients at the resource metadata", async () => {
		const res = await request(app)
			.post("/mcp")
			.send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
		expect(res.status).toBe(401);
		expect(res.headers["www-authenticate"]).toContain(
			'resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource/mcp"',
		);
	});

	afterAll(async () => {
		await closeDb();
	});

	it("rejects an unauthenticated initialize request", async () => {
		const res = await request(app)
			.post("/mcp")
			.send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
		expect(res.status).toBe(401);
	});

	it("rejects a wrong bearer token", async () => {
		const res = await request(app)
			.post("/mcp")
			.set("Authorization", "Bearer nope")
			.send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
		expect(res.status).toBe(401);
	});

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
			});
		expect(res.status).toBe(200);
	});

	it("serves an unauthenticated health check", async () => {
		const res = await request(app).get("/health");
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: "ok" });
	});
});
