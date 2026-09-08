import { createHash } from "node:crypto";

import { GoogleGenAI } from "@google/genai";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

type IngredientLike = { name: string };

/**
 * Duplicated from mcp/src/embedding-content.ts on purpose: functions/ is a
 * separate deployable and a cross-workspace import would break its packaging.
 * Both copies must stay in sync — a divergence changes the hash and forces a
 * full re-embed of the collection.
 */
export function embeddingText(recipe: { title: string; ingredients: IngredientLike[]; text: string }): string {
	const names = (recipe.ingredients ?? []).map((i) => i.name).join(", ");
	return `${recipe.title}\n${names}\n${recipe.text}`;
}

export function contentHash(text: string): string {
	return createHash("sha256").update(text, "utf8").digest("hex");
}

export async function embed(apiKey: string, text: string): Promise<number[]> {
	const client = new GoogleGenAI({ apiKey });
	const response = await client.models.embedContent({
		model: EMBEDDING_MODEL,
		contents: text,
		config: { outputDimensionality: EMBEDDING_DIMENSIONS },
	});
	const values = response.embeddings?.[0]?.values;
	if (!values) throw new Error("Gemini returned no embedding values");
	return values;
}
