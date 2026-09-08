import { GoogleGenAI } from "@google/genai";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

export interface Embedder {
	embed(text: string): Promise<number[]>;
}

export class GeminiEmbedder implements Embedder {
	private readonly client: GoogleGenAI;

	constructor(apiKey: string) {
		this.client = new GoogleGenAI({ apiKey });
	}

	async embed(text: string): Promise<number[]> {
		const response = await this.client.models.embedContent({
			model: EMBEDDING_MODEL,
			contents: text,
			config: { outputDimensionality: EMBEDDING_DIMENSIONS },
		});
		const values = response.embeddings?.[0]?.values;
		if (!values) throw new Error("Gemini returned no embedding values");
		return values;
	}
}
