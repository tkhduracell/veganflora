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
