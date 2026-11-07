import {
	GoogleTokenVerifier,
	StaticOrGoogleVerifier,
} from "../src/google-auth.js";

const NOW_MS = 1_800_000_000_000;
const EXP = String(NOW_MS / 1000 + 600);

function fakeFetch(body: Record<string, unknown>, ok = true) {
	const calls: string[] = [];
	const fn = (async (url: string) => {
		calls.push(url);
		return { ok, json: async () => body } as Response;
	}) as unknown as typeof fetch;
	return { fn, calls };
}

function verifier(body: Record<string, unknown>, ok = true) {
	const f = fakeFetch(body, ok);
	const v = new GoogleTokenVerifier({
		clientIds: ["client-a"],
		allowedEmails: ["Chef@Example.com"],
		fetch: f.fn,
		now: () => NOW_MS,
	});
	return { v, calls: f.calls };
}

const valid = {
	aud: "client-a",
	email: "chef@example.com",
	email_verified: "true",
	exp: EXP,
	scope: "openid https://www.googleapis.com/auth/userinfo.email",
};

describe("GoogleTokenVerifier", () => {
	it("accepts a token for our client from an allowed, verified email", async () => {
		const { v, calls } = verifier(valid);
		const info = await v.verifyAccessToken("tok");
		expect(info).toMatchObject({
			clientId: "client-a",
			expiresAt: Number(EXP),
			extra: { email: "chef@example.com" },
		});
		expect(info.scopes).toContain("openid");
		expect(calls[0]).toBe(
			"https://oauth2.googleapis.com/tokeninfo?access_token=tok",
		);
	});

	it("caches a verified token until it expires", async () => {
		const { v, calls } = verifier(valid);
		await v.verifyAccessToken("tok");
		await v.verifyAccessToken("tok");
		expect(calls).toHaveLength(1);
	});

	it("rejects a token Google does not recognise", async () => {
		const { v } = verifier({ error: "invalid_token" }, false);
		await expect(v.verifyAccessToken("tok")).rejects.toThrow(
			"Token rejected by Google",
		);
	});

	it("rejects a token minted for another client", async () => {
		const { v } = verifier({ ...valid, aud: "someone-else" });
		await expect(v.verifyAccessToken("tok")).rejects.toThrow("another client");
	});

	it("rejects an email outside the allowlist", async () => {
		const { v } = verifier({ ...valid, email: "stranger@example.com" });
		await expect(v.verifyAccessToken("tok")).rejects.toThrow("not allowed");
	});

	it("rejects an unverified email", async () => {
		const { v } = verifier({ ...valid, email_verified: "false" });
		await expect(v.verifyAccessToken("tok")).rejects.toThrow("verified email");
	});
});

describe("StaticOrGoogleVerifier", () => {
	it("accepts the static token without calling Google", async () => {
		const { v, calls } = verifier(valid);
		const info = await new StaticOrGoogleVerifier(
			"static-secret",
			v,
		).verifyAccessToken("static-secret");
		expect(info.clientId).toBe("static");
		expect(info.expiresAt).toBeGreaterThan(Date.now() / 1000);
		expect(calls).toHaveLength(0);
	});

	it("falls back to Google for any other token", async () => {
		const { v } = verifier(valid);
		const info = await new StaticOrGoogleVerifier(
			"static-secret",
			v,
		).verifyAccessToken("google-tok");
		expect(info.clientId).toBe("client-a");
	});

	it("rejects a non-static token when Google is not configured", async () => {
		await expect(
			new StaticOrGoogleVerifier("static-secret", undefined).verifyAccessToken(
				"nope",
			),
		).rejects.toThrow("Invalid token");
	});
});
