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
