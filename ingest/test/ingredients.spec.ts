import { parseIngredient, noEmpty, normalize } from "../src/ingredients";

describe("ingredients.ts", () => {
	it("parseIngredient(): parse four parts", () => {
		const out = parseIngredient("1 ½ dl kokande vatten");
		expect(out).toStrictEqual({
			amount: "1 ½",
			measure: "dl",
			name: "kokande vatten",
		});
	});

	it("parseIngredient(): parse three parts", () => {
		const out = parseIngredient("½ dl sesamfrön");

		expect(out).toStrictEqual({
			amount: "½",
			measure: "dl",
			name: "sesamfrön",
		});
	});

	it("parseIngredient(): parse two parts", () => {
		const out = parseIngredient("½ advocado");

		expect(out).toStrictEqual({ amount: "½", name: "advocado" });
	});

	it("parseIngredient(): parse two parts with adjectives", () => {
		const out = parseIngredient("3 stora söta äpplen");

		expect(out).toStrictEqual({
			amount: "3",
			measure: "stora",
			name: "söta äpplen",
		});
	});

	it("parseIngredient(): parse two parts with adjectives", () => {
		const out = parseIngredient(
			"30-40 g urkärnade dadlar (eller 1-2 tsk lönnsirap)",
		);

		expect(out).toStrictEqual({
			amount: "30-40",
			measure: "g",
			name: "urkärnade dadlar",
			note: "eller 1-2 tsk lönnsirap",
		});
	});

	it("parseIngredient(): parse one part", () => {
		const out = parseIngredient("apple");

		expect(out).toStrictEqual({ name: "apple" });
	});

	it("noEmpty() matches empty string", () => {
		expect(noEmpty("")).toBeFalsy();
	});

	it("noEmpty() matches whitespace string", () => {
		expect(noEmpty(" ")).toBeFalsy();
	});

	it("noEmpty() matches unicode whitespace string", () => {
		expect(noEmpty(" ")).toBeFalsy();
	});

	it("noEmpty() does not matche text", () => {
		expect(noEmpty("foorbar")).toBeTruthy();
	});

	it("normalize() does replace halfs", () => {
		expect(normalize("1/2 1\\2")).toBe("½ ½");
	});

	it("normalize() does replace common", () => {
		expect(normalize("1/2 1/3 1/4 3/4")).toBe("½ ⅓ ¼ ¾");
	});
});
