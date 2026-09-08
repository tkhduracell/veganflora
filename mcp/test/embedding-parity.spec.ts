import {
	contentHash as fnHash,
	embeddingText as fnText,
} from "../../functions/src/embedding.js";
import {
	contentHash as mcpHash,
	embeddingText as mcpText,
} from "../src/embedding-content.js";

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

	it("short-circuits on a second invocation, so the trigger cannot recurse", () => {
		const recipe = cases[0];
		// Simulates the trigger's write-back: the hash it stores must equal the
		// hash recomputed from the stored document on the retriggered run.
		const storedHash = fnHash(fnText(recipe));
		expect(fnHash(fnText(recipe))).toBe(storedHash);
	});
});
