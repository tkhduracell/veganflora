import { timingSafeEqual } from "node:crypto";
import {
	type AuthInfo,
	OAuthError,
	OAuthErrorCode,
	type OAuthMetadata,
	type OAuthTokenVerifier,
} from "@modelcontextprotocol/server";

const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

// Google publishes OIDC discovery, not RFC 8414 metadata, so MCP clients that probe
// this server's origin for /.well-known/oauth-authorization-server get this copy.
// Google has no dynamic client registration: clients must be given our client id.
export const GOOGLE_OAUTH_METADATA: OAuthMetadata = {
	issuer: "https://accounts.google.com",
	authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
	token_endpoint: "https://oauth2.googleapis.com/token",
	revocation_endpoint: "https://oauth2.googleapis.com/revoke",
	response_types_supported: ["code"],
	grant_types_supported: ["authorization_code", "refresh_token"],
	code_challenge_methods_supported: ["S256", "plain"],
	token_endpoint_auth_methods_supported: [
		"client_secret_post",
		"client_secret_basic",
	],
	scopes_supported: ["openid", "email"],
};

export const GOOGLE_SCOPES = ["openid", "email"];

type TokenInfo = {
	aud?: string;
	azp?: string;
	email?: string;
	email_verified?: string | boolean;
	exp?: string;
	scope?: string;
};

function safeEqual(a: string, b: string): boolean {
	const left = Buffer.from(a, "utf8");
	const right = Buffer.from(b, "utf8");
	// timingSafeEqual throws on length mismatch, so compare lengths first —
	// the length of the expected token is not itself a secret worth protecting.
	if (left.length !== right.length) return false;
	return timingSafeEqual(left, right);
}

function invalid(message: string): OAuthError {
	return new OAuthError(OAuthErrorCode.InvalidToken, message);
}

export class GoogleTokenVerifier implements OAuthTokenVerifier {
	// Google access tokens are opaque, so each one is checked against tokeninfo once
	// and cached until it expires — one round trip per token, not per MCP request.
	private readonly cache = new Map<string, AuthInfo>();
	private readonly allowedEmails: Set<string>;

	constructor(
		private readonly opts: {
			clientIds: string[];
			allowedEmails: string[];
			fetch?: typeof fetch;
			now?: () => number;
		},
	) {
		this.allowedEmails = new Set(
			opts.allowedEmails.map((email) => email.toLowerCase()),
		);
	}

	async verifyAccessToken(token: string): Promise<AuthInfo> {
		const now = (this.opts.now ?? Date.now)() / 1000;
		const cached = this.cache.get(token);
		if (cached && (cached.expiresAt ?? 0) > now) return cached;
		this.cache.delete(token);

		const res = await (this.opts.fetch ?? fetch)(
			`${TOKENINFO_URL}?access_token=${encodeURIComponent(token)}`,
		);
		if (!res.ok) throw invalid("Token rejected by Google");
		const info = (await res.json()) as TokenInfo;

		// aud is the client the token was minted for; a token issued to any other
		// Google app (even for the same user) must not unlock this server.
		const audience = info.aud ?? info.azp ?? "";
		if (!this.opts.clientIds.includes(audience))
			throw invalid("Token was issued to another client");

		const email = info.email?.toLowerCase();
		const verified =
			info.email_verified === true || info.email_verified === "true";
		if (!email || !verified) throw invalid("Token carries no verified email");
		if (!this.allowedEmails.has(email)) throw invalid("Account is not allowed");

		const authInfo: AuthInfo = {
			token,
			clientId: audience,
			scopes: info.scope?.split(" ").filter(Boolean) ?? [],
			expiresAt: Number(info.exp),
			extra: { email },
		};
		this.cache.set(token, authInfo);
		return authInfo;
	}
}

/**
 * Accepts the legacy static MCP_BEARER_TOKEN before falling back to Google OAuth,
 * so existing clients keep working while they migrate.
 */
export class StaticOrGoogleVerifier implements OAuthTokenVerifier {
	constructor(
		private readonly staticToken: string | undefined,
		private readonly google: OAuthTokenVerifier | undefined,
	) {}

	async verifyAccessToken(token: string): Promise<AuthInfo> {
		if (this.staticToken && safeEqual(token, this.staticToken)) {
			// The static token never expires, but the SDK rejects AuthInfo without expiresAt.
			return {
				token,
				clientId: "static",
				scopes: [],
				expiresAt: Math.floor(Date.now() / 1000) + 3600,
			};
		}
		if (!this.google) throw invalid("Invalid token");
		return this.google.verifyAccessToken(token);
	}
}
