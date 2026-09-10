import { createHash } from "node:crypto";

import type { Recipe } from "./types.js";

/**
 * The text that gets embedded. Amounts and measures are excluded on purpose:
 * "2 dl" carries no semantic signal and only dilutes the vector.
 */
export function embeddingText(
	recipe: Pick<Recipe, "title" | "ingredients" | "text">,
): string {
	const names = recipe.ingredients.map((i) => i.name).join(", ");
	return `${recipe.title}\n${names}\n${recipe.text}`;
}

export function contentHash(text: string): string {
	return createHash("sha256").update(text, "utf8").digest("hex");
}
