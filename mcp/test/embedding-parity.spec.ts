import {
	EMBEDDING_DIMENSIONS as FN_DIMENSIONS,
	EMBEDDING_MODEL as FN_MODEL,
	contentHash as fnHash,
	embeddingText as fnText,
	needsEmbedding,
} from "../../functions/src/embedding.js";
import {
	contentHash as mcpHash,
	embeddingText as mcpText,
} from "../src/embedding-content.js";
import {
	EMBEDDING_DIMENSIONS as MCP_DIMENSIONS,
	EMBEDDING_MODEL as MCP_MODEL,
} from "../src/embeddings.js";

// functions/ duplicates this logic because it is a separate deployable and
// cannot import across the workspace boundary. If the two ever diverge, every
// stored hash changes and the whole collection silently re-embeds — so the
// duplication is pinned here.
const cases = [
	{
		title: "Linssoppa",
		ingredients: [{ name: "röda linser" }, { name: "morot" }],
		text: "Koka.",
	},
	{ title: "Vatten", ingredients: [], text: "Häll upp." },
	{ title: "Ägg", ingredients: [{ name: "ägg" }], text: "Stek.\nServera." },
];

describe("embedding hash parity between mcp and functions", () => {
	it.each(cases)("produces identical text and hash for $title", (recipe) => {
		expect(mcpText(recipe)).toBe(fnText(recipe));
		expect(mcpHash(mcpText(recipe))).toBe(fnHash(fnText(recipe)));
	});

	// Model and dimensions are the other half of the same hazard. If the two
	// workspaces disagree, the trigger writes vectors of one width while search
	// queries with another: findNearest fails at runtime, and because the content
	// hash is unaffected the backfill reports skipped=N and refuses to repair it.
	// Neither the text nor the hash assertions above would catch that.
	it("agrees on the embedding model", () => {
		expect(MCP_MODEL).toBe(FN_MODEL);
	});

	it("agrees on the embedding dimension count", () => {
		expect(MCP_DIMENSIONS).toBe(FN_DIMENSIONS);
	});
});

describe("needsEmbedding — the guard that stops the trigger recursing", () => {
	const recipe = {
		title: "Linssoppa",
		ingredients: [{ name: "linser" }],
		text: "Koka.",
	};
	const storedHash = fnHash(fnText(recipe));

	it("embeds a recipe that has never been embedded", () => {
		expect(needsEmbedding(recipe)).toBe(true);
	});

	it("does NOT re-embed after the trigger's own write-back", () => {
		// The recursion case: the trigger stored this hash, and that write fires the
		// trigger again. The second run must decline, or the chain never ends.
		expect(needsEmbedding({ ...recipe, embeddingHash: storedHash })).toBe(
			false,
		);
	});

	it("re-embeds when the recipe text actually changes", () => {
		expect(
			needsEmbedding({
				...recipe,
				text: "Koka länge.",
				embeddingHash: storedHash,
			}),
		).toBe(true);
	});

	it("re-embeds when an ingredient changes", () => {
		expect(
			needsEmbedding({
				...recipe,
				ingredients: [{ name: "gula linser" }],
				embeddingHash: storedHash,
			}),
		).toBe(true);
	});

	it("declines a recipe with no title or text rather than embedding junk", () => {
		expect(needsEmbedding({ title: "", text: "" })).toBe(false);
	});
});
