import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { HttpsOptions, onCall, onRequest } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { GoogleGenAI, Type } from "@google/genai";
import { createMcpServer } from "./mcp.js";
import { fetchAndSummarize, summarizeWithChatLLM } from "./summarize.js";

const apiKey = defineSecret("GEMINI_API_KEY");
const mcpApiKey = defineSecret("MCP_API_KEY");
const region: HttpsOptions["region"] = "europe-north1";
const timeoutSeconds: HttpsOptions["timeoutSeconds"] = 120;
const secrets: HttpsOptions["secrets"] = [apiKey];
const cors: HttpsOptions["cors"] = "https://veganflora.web.app";

initializeApp();

const db = getFirestore();
const root = db.collection("veganflora").doc("root");

const randomColor = () =>
	`#${Math.floor(Math.random() * 16777215).toString(16)}`;

const SYSTEM_PROMPT = `
       You are a helpful AI assistant that can summarize recipes in Swedish
       and provide them in JSON format.

       Instructions for the recipe text:
        * Do not include ingredients used only for serving or granish in the ingredient list, mearly mention them in
       the text at the last step.
        * Create a clear step by step text instruction, that should contain a list of steps in a bullet point format without any header.
        * The text should not include any main header, and ONLY contain several Markdown sections if there are natural parts to the recipe text instructions itself.
        * Do not include "vegan" in the title or ingredients, since everything is assumed to be vegan.
		* The title should be in Swedish, and should not include any brand names.
		* The title should be a short and descriptive name for the recipe, e.g. "Lasagne" or "Chokladbollar".
		* The text should not include any unit measurements, e.g. "1 dl mjölk" should be "mjölk".
		* The text should not include any brand names, e.g. "Arla Ko® Standardmjöl" should be "mjölk".
	   Instructions for the ingredient list:
		* The ingredient list should be in Swedish, and use Swedish units (e.g. dl, tsk, msk, gram).
	   	* Remove any brands from the ingredient list, e.g. "Arla Ko® Standardmjöl" should be "mjölk".
		* Use items with {name: *Section*} to create a section separating the ingredients, e.g. {name: "Fyllning"} for a filling section.
	   Instructions for the image:
		* If the recipe has an image that you think represent the recipe, include the URL to the image in the JSON response. Else, use an empty string.
    `.replace(/\n/g, "");

const recipeResponseSchema = {
	type: Type.OBJECT,
	properties: {
		text: {
			type: Type.STRING,
			description: "Step-by-step instructions of the recipe.",
		},
		title: {
			type: Type.STRING,
			description: "The title of the recipe.",
		},
		size: {
			type: Type.STRING,
			description:
				"Size of the recipe (e.g. 6 portioner, 12 bullar, 9 bars, 3 bitar)",
		},
		image: {
			type: Type.STRING,
			description:
				"URL to an image of the recipe. Empty string if no image is available.",
		},
		ingredients: {
			type: Type.ARRAY,
			description:
				"A list of ingredients used in the recipe, excluding optional items.",
			items: {
				type: Type.OBJECT,
				properties: {
					name: {
						type: Type.STRING,
						description: "The name of the ingredient.",
					},
					amount: {
						type: Type.STRING,
						description: "The quantity of the ingredient needed.",
					},
					measure: {
						type: Type.STRING,
						description:
							"The measurement unit for the ingredient (e.g., dl, tsk, msk, gram).",
					},
				},
				propertyOrdering: ["name", "amount", "measure"],
			},
		},
	},
	propertyOrdering: ["title", "size", "image", "text", "ingredients"],
} as const;

async function summarizeImageWithChatLLM(
	storagePath: string,
	mimeType: string,
): Promise<string> {
	const ai = new GoogleGenAI({ apiKey: apiKey.value() });

	const bucket = getStorage().bucket();
	const [buffer] = await bucket.file(storagePath).download();
	const base64 = buffer.toString("base64");

	const response = await ai.models.generateContent({
		model: "gemini-3-pro-preview",
		contents: [
			{ inlineData: { data: base64, mimeType } },
			"Summarize this recipe in Swedish with Swedish units",
		],
		config: {
			systemInstruction: SYSTEM_PROMPT,
			responseMimeType: "application/json",
			responseSchema: recipeResponseSchema,
		},
	});

	await bucket
		.file(storagePath)
		.delete()
		.catch((err: unknown) => {
			logger.warn("Failed to delete temp import file", { storagePath, err });
		});

	return response.text ?? "";
}

export const importUrl = onCall(
	{ secrets, timeoutSeconds, region, cors },
	async ({ data }) => {
		try {
			const summary = await fetchAndSummarize(data.url, apiKey.value());
			return summary;
		} catch (error) {
			logger.error("An error in importUrl:", error);
			throw error;
		}
	},
);

export const importText = onCall(
	{ secrets, timeoutSeconds, region, cors },
	async ({ data }) => {
		try {
			logger.info("Summarizing using LLM");
			const summary = await summarizeWithChatLLM(data.text, apiKey.value());
			return summary;
		} catch (error) {
			logger.error("An error in importText:", error);
			throw error;
		}
	},
);

export const importImage = onCall(
	{ secrets, timeoutSeconds, region, cors },
	async ({ data }) => {
		try {
			logger.info("Summarizing image using LLM", {
				storagePath: data.storagePath,
			});
			const summary = await summarizeImageWithChatLLM(
				data.storagePath,
				data.mimeType,
			);
			return summary;
		} catch (error) {
			logger.error("An error in importImage:", error);
			throw error;
		}
	},
);

export const prefillUpdate = onDocumentWritten(
	{
		document: "/veganflora/root/recipies/{id}",
		timeoutSeconds,
		region,
	},
	async ({ params }) => {
		logger.info(`${params.id}:onWrite()`);

		type TagInfo = { text: string; color: string };
		type TagKey = string;

		type Category = string;
		type CompatTags = (TagKey | TagInfo)[];

		const tagsByName = new Map<TagKey, TagInfo>();
		const categorySet = new Set<Category>();

		{
			const { prefill } = await root.get().then(
				(itm) =>
					itm.data() as {
						prefill?: { tags: TagInfo[]; categories: Category[] };
					},
			);
			if (prefill) {
				prefill.tags.forEach((t) => tagsByName.set(t.text, t));
				prefill.categories.forEach((c) => categorySet.add(c));
			}
		}

		{
			const current = await root.collection("recipies").doc(params.id).get();
			if (!current.exists)
				return logger.warn(`Document ${params.id} does not exist`);

			logger.info(`Updating updated doc with tags`, {});
			const tags: TagKey[] = (current.data()!.tags as CompatTags).map((t) =>
				typeof t === "string" ? t : t.text,
			);
			await current.ref.update({ tags });
		}

		const cursor = await root.collection("recipies").get();
		cursor.forEach((doc) => {
			const { tags, category } = doc.data() as {
				tags?: CompatTags;
				category?: Category[];
			};

			if (!category) return logger.error(`Document ${doc.id} has no category`);
			categorySet.add(category.join(" / "));

			if (!tags) return logger.warn(`Document ${doc.id} has no tags`);
			tags
				.map((t) => (typeof t === "string" ? t : (t.text ?? "")))
				.filter((tag) => tag !== "")
				.filter((tag) => !tagsByName.has(tag))
				.forEach((tag) =>
					tagsByName.set(tag, { text: tag, color: randomColor() }),
				);
		});

		const tags = [...tagsByName.values()].sort((a, b) =>
			a.text.localeCompare(b.text),
		);
		const categories = [...categorySet.values()].sort();

		logger.info(`Updating prefill`, { tags, categories });
		await root.update({
			"prefill.tags": tags,
			"prefill.categories": categories,
		});
	},
);

export const mcp = onRequest(
	{ region, timeoutSeconds, secrets: [mcpApiKey, apiKey] },
	async (req, res) => {
		const auth = req.headers.authorization;
		if (!auth || auth !== `Bearer ${mcpApiKey.value()}`) {
			res.status(401).json({
				jsonrpc: "2.0",
				error: { code: -32000, message: "Unauthorized" },
				id: null,
			});
			return;
		}

		if (req.method !== "POST") {
			res.status(405).json({
				jsonrpc: "2.0",
				error: { code: -32000, message: "Method not allowed." },
				id: null,
			});
			return;
		}

		try {
			const server = createMcpServer(apiKey.value());
			const transport = new StreamableHTTPServerTransport({
				sessionIdGenerator: undefined,
				enableJsonResponse: true,
			});

			res.on("close", () => {
				transport.close();
				server.close();
			});

			await server.connect(transport);
			await transport.handleRequest(req, res, req.body);
		} catch (error) {
			logger.error("Error handling MCP request:", error);
			if (!res.headersSent) {
				res.status(500).json({
					jsonrpc: "2.0",
					error: { code: -32603, message: "Internal server error" },
					id: null,
				});
			}
		}
	},
);
