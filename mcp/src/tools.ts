import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import type { Embedder } from "./embeddings.js";
import {
	RecipeExistsError,
	RecipeNotFoundError,
	type RecipeRepository,
} from "./repository.js";

const ingredientSchema = z.object({
	name: z.string().describe("Ingredient name in Swedish, without brand names"),
	amount: z.string().optional().describe('Quantity, e.g. "2"'),
	measure: z
		.string()
		.optional()
		.describe("Swedish unit, e.g. dl, tsk, msk, gram"),
});

const recipeFields = {
	title: z.string().describe("Swedish recipe name"),
	size: z.string().describe('Portion size, e.g. "6 portioner"'),
	ingredients: z.array(ingredientSchema),
	text: z.string().describe("Markdown step-by-step instructions"),
	category: z
		.array(z.string())
		.describe('Hierarchical category path, e.g. ["Soppor"]'),
	tags: z.array(z.string()),
	image: z.string().optional(),
};

function errorResult(message: string) {
	return { content: [{ type: "text" as const, text: message }], isError: true };
}

function okResult(payload: Record<string, unknown>) {
	return {
		content: [{ type: "text" as const, text: JSON.stringify(payload) }],
		structuredContent: payload,
	};
}

export function registerRecipeTools(
	server: McpServer,
	repo: RecipeRepository,
	embedder: Embedder,
): void {
	server.registerTool(
		"search_recipes",
		{
			description:
				"Semantic search over the recipe collection. Best for descriptive queries " +
				'("something warming for a cold evening"). For exact ingredient or tag ' +
				"membership, prefer list_recipes with a tag or category filter.",
			inputSchema: z.object({
				query: z
					.string()
					.describe("Natural language description of what to cook"),
				limit: z.number().int().min(1).max(20).optional(),
			}),
		},
		async ({ query, limit }) => {
			try {
				const vector = await embedder.embed(query);
				const hits = await repo.searchByVector(vector, limit ?? 5);
				return okResult({ results: hits });
			} catch (err) {
				return errorResult(`Search failed: ${(err as Error).message}`);
			}
		},
	);

	server.registerTool(
		"get_recipe",
		{
			description: "Fetch one full recipe by its document id.",
			inputSchema: z.object({ id: z.string() }),
		},
		async ({ id }) => {
			try {
				const recipe = await repo.getRecipe(id);
				if (!recipe) return errorResult(`No recipe with id "${id}".`);
				const {
					embedding: _embedding,
					embeddingHash: _embeddingHash,
					...rest
				} = recipe;
				return okResult(rest);
			} catch (err) {
				return errorResult(`Lookup failed: ${(err as Error).message}`);
			}
		},
	);

	server.registerTool(
		"list_recipes",
		{
			description:
				"List recipes, optionally filtered by exact category or tag. Paginated.",
			inputSchema: z.object({
				category: z.string().optional(),
				tag: z.string().optional(),
				limit: z.number().int().min(1).max(50).optional(),
				cursor: z.string().optional(),
			}),
		},
		async ({ category, tag, limit, cursor }) => {
			try {
				const page = await repo.listRecipes({
					category,
					tag,
					limit: limit ?? 20,
					cursor,
				});
				return okResult(page as unknown as Record<string, unknown>);
			} catch (err) {
				return errorResult(`List failed: ${(err as Error).message}`);
			}
		},
	);

	server.registerTool(
		"create_recipe",
		{
			description:
				"Create a new recipe. The document id is derived from category and title; " +
				"creation fails if that id is already taken.",
			inputSchema: z.object(recipeFields).strict(),
		},
		async (recipe) => {
			try {
				const { id } = await repo.createRecipe(recipe);
				return okResult({ id });
			} catch (err) {
				if (err instanceof RecipeExistsError) return errorResult(err.message);
				return errorResult(`Create failed: ${(err as Error).message}`);
			}
		},
	);

	server.registerTool(
		"update_recipe",
		{
			description:
				"Update named fields of an existing recipe. Omitted fields are left unchanged. " +
				"Cannot delete a recipe and cannot write search embeddings.",
			inputSchema: z
				.object({
					id: z.string(),
					title: recipeFields.title.optional(),
					size: recipeFields.size.optional(),
					ingredients: recipeFields.ingredients.optional(),
					text: recipeFields.text.optional(),
					category: recipeFields.category.optional(),
					tags: recipeFields.tags.optional(),
					image: recipeFields.image,
				})
				.strict(),
		},
		async ({ id, ...patch }) => {
			try {
				await repo.updateRecipe(id, patch);
				return okResult({ id, updated: Object.keys(patch) });
			} catch (err) {
				if (err instanceof RecipeNotFoundError) return errorResult(err.message);
				return errorResult(`Update failed: ${(err as Error).message}`);
			}
		},
	);
}
