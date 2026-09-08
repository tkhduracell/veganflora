import { contentHash, embeddingText } from "../src/embedding-content.js"

const recipe = {
	title: "Linssoppa",
	ingredients: [
		{ name: "röda linser", amount: "2", measure: "dl" },
		{ name: "morot", amount: "1", measure: "st" },
	],
	text: "Koka linserna.\nTillsätt morot.",
}

describe("embeddingText", () => {
	it("combines title, ingredient names and text", () => {
		expect(embeddingText(recipe)).toBe("Linssoppa\nröda linser, morot\nKoka linserna.\nTillsätt morot.")
	})

	it("omits amounts and measures", () => {
		expect(embeddingText(recipe)).not.toContain("dl")
	})

	it("handles a recipe with no ingredients", () => {
		expect(embeddingText({ title: "Vatten", ingredients: [], text: "Häll upp." })).toBe("Vatten\n\nHäll upp.")
	})
})

describe("contentHash", () => {
	it("is stable for the same input", () => {
		expect(contentHash("abc")).toBe(contentHash("abc"))
	})

	it("differs for different input", () => {
		expect(contentHash("abc")).not.toBe(contentHash("abd"))
	})

	it("returns a hex sha256 digest", () => {
		expect(contentHash("abc")).toMatch(/^[0-9a-f]{64}$/)
	})
})
