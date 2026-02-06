import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { fetchAndSummarize, summarizeWithChatLLM } from "./summarize.js";

export function createMcpServer(geminiApiKey: string): McpServer {
	const server = new McpServer({
		name: "veganflora",
		version: "1.0.0",
	});

	const db = getFirestore();
	const root = db.collection("veganflora").doc("root");
	const recipies = root.collection("recipies");

	server.registerTool(
		"search_recipes",
		{
			title: "Search Recipes",
			description:
				"Search recipes by title, tag, category, or ingredient name. Returns a summary list. All recipe content is in Swedish.",
			inputSchema: {
				query: z
					.string()
					.optional()
					.describe("Search term to match against recipe titles"),
				tag: z.string().optional().describe("Filter by tag name"),
				category: z.string().optional().describe("Filter by category name"),
				ingredient: z.string().optional().describe("Filter by ingredient name"),
				limit: z
					.number()
					.optional()
					.default(20)
					.describe("Max results to return (default 20)"),
			},
		},
		async ({ query, tag, category, ingredient, limit }) => {
			const snapshot = await recipies.get();
			type RecipeDoc = {
				title: string;
				size: string;
				category: string[];
				tags: string[];
				ingredients: { name: string; amount: string; measure: string }[];
			};

			let results = snapshot.docs.map((doc) => ({
				key: doc.id,
				...(doc.data() as RecipeDoc),
			}));

			if (query) {
				const q = query.toLowerCase();
				results = results.filter((r) => r.title.toLowerCase().includes(q));
			}
			if (tag) {
				const t = tag.toLowerCase();
				results = results.filter((r) =>
					r.tags?.some((tg) => tg.toLowerCase().includes(t)),
				);
			}
			if (category) {
				const c = category.toLowerCase();
				results = results.filter((r) =>
					r.category?.some((cat) => cat.toLowerCase().includes(c)),
				);
			}
			if (ingredient) {
				const i = ingredient.toLowerCase();
				results = results.filter((r) =>
					r.ingredients?.some((ing) => ing.name.toLowerCase().includes(i)),
				);
			}

			const limited = results.slice(0, limit);
			const output = limited.map((r) => ({
				key: r.key,
				title: r.title,
				size: r.size,
				category: r.category?.join(" / "),
				tags: r.tags,
			}));

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(
							{ count: results.length, recipes: output },
							null,
							2,
						),
					},
				],
			};
		},
	);

	server.registerTool(
		"get_recipe",
		{
			title: "Get Recipe",
			description:
				"Get a full recipe by its document key. Returns all fields including ingredients and instructions.",
			inputSchema: {
				key: z
					.string()
					.describe(
						"The recipe document key (e.g. 'Frukost\\\\Smoothies\\\\Banansmoothie')",
					),
			},
		},
		async ({ key }) => {
			const doc = await recipies.doc(key).get();
			if (!doc.exists) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ error: "Recipe not found" }),
						},
					],
					isError: true,
				};
			}
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({ key: doc.id, ...doc.data() }, null, 2),
					},
				],
			};
		},
	);

	server.registerTool(
		"list_tags",
		{
			title: "List Tags",
			description: "List all available recipe tags.",
			inputSchema: {},
		},
		async () => {
			const doc = await root.get();
			const data = doc.data() as
				| { prefill?: { tags: { text: string; color: string }[] } }
				| undefined;
			const tags = data?.prefill?.tags ?? [];
			return {
				content: [
					{ type: "text" as const, text: JSON.stringify({ tags }, null, 2) },
				],
			};
		},
	);

	server.registerTool(
		"list_categories",
		{
			title: "List Categories",
			description: "List all available recipe categories.",
			inputSchema: {},
		},
		async () => {
			const doc = await root.get();
			const data = doc.data() as
				| { prefill?: { categories: string[] } }
				| undefined;
			const categories = data?.prefill?.categories ?? [];
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({ categories }, null, 2),
					},
				],
			};
		},
	);

	server.registerTool(
		"import_recipe_from_url",
		{
			title: "Import Recipe from URL",
			description:
				"Fetch a recipe from a URL and summarize it into structured JSON using AI. Returns a Swedish recipe with title, ingredients, instructions, portion size, and image.",
			inputSchema: {
				url: z.string().url().describe("URL of the recipe page to import"),
			},
		},
		async ({ url }) => {
			try {
				const result = await fetchAndSummarize(url, geminiApiKey);
				return {
					content: [{ type: "text" as const, text: result }],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error: error instanceof Error ? error.message : String(error),
							}),
						},
					],
					isError: true,
				};
			}
		},
	);

	server.registerTool(
		"import_recipe_from_text",
		{
			title: "Import Recipe from Text",
			description:
				"Summarize recipe text into structured JSON using AI. Provide raw recipe text and get back a Swedish recipe with title, ingredients, instructions, portion size, and image.",
			inputSchema: {
				text: z.string().describe("Raw recipe text to summarize"),
			},
		},
		async ({ text }) => {
			try {
				const result = await summarizeWithChatLLM(text, geminiApiKey);
				return {
					content: [{ type: "text" as const, text: result }],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error: error instanceof Error ? error.message : String(error),
							}),
						},
					],
					isError: true,
				};
			}
		},
	);

	return server;
}
