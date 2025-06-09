import { logger } from "firebase-functions";

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { defineSecret } from "firebase-functions/params";
import { HttpsOptions, onCall } from "firebase-functions/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

const apiKey = defineSecret("GEMINI_API_KEY");
const region: HttpsOptions['region'] = "europe-north1";
const timeoutSeconds: HttpsOptions['timeoutSeconds'] = 120;
const secrets: HttpsOptions['secrets'] = [apiKey];
const cors: HttpsOptions['cors'] = 'https://veganflora.web.app';

import OpenAI from "openai";

initializeApp();

const db = getFirestore();
const root = db.collection("veganflora").doc("root");

const randomColor = () =>
	`#${Math.floor(Math.random() * 16777215).toString(16)}`;

async function summarizeWithChatLLM(text: string): Promise<string> {
	const apiKeyValue = apiKey.value();

	const openai = new OpenAI({
		apiKey: apiKeyValue,
		baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
	});
	const SYSTEM_PROMPT = `
       You are a helpful AI assistant that can summarize recipes in Swedish
       and provide them in JSON format. 
       
       Instructions: 
        * Do not include ingredients used only for serving or granish in the ingredient list, mearly mention them in 
       the text at the last step. 
        * The step by step text instruction should contain a list of steps in a Markdown language format.
        * The step by step text instruction should not include any main header, but can contain several 
          Markdown sections if there are natual parts to the recepie text instructions itself.
        * Do not include "vegan" in the title or ingredients, since everything is assumed to be vegan.
    `.replace(/\n/g, "");
	const USER_PROMPT = `
      Summarize this recipe in Swedish with Swedish units: ${text}
    `.trim();
	const response = await openai.chat.completions.create({
		model: "gemini-2.0-flash",
		messages: [
			{ role: "system", content: [{ text: SYSTEM_PROMPT, type: "text" }] },
			{ role: "user", content: [{ text: USER_PROMPT, type: "text" }] },
		],
		response_format: {
			type: "json_schema",
			json_schema: {
				name: "recipe",
				schema: {
					type: "object",
					required: ["ingredients", "title", "text", "size"],
					properties: {
						text: {
							type: "string",
							description: "Step-by-step instructions of the recipe.",
						},
						title: {
							type: "string",
							description: "The title of the recipe.",
						},
						size: {
							type: "string",
							description:
								"Size of the recepie (e.g. 6 portioner, 12 bullar, 9 bars, 3 bitar)",
						},
						ingredients: {
							type: "array",
							items: {
								type: "object",
								required: ["name", "amount", "measure"],
								properties: {
									name: {
										type: "string",
										description: "The name of the ingredient.",
									},
									amount: {
										type: "string",
										description: "The quantity of the ingredient needed.",
									},
									measure: {
										type: "string",
										description:
											"The measurement unit for the ingredient (e.g., tsk, dl, cups, gram).",
									},
								},
								additionalProperties: false,
							},
							description:
								"A list of ingredients used in the recipe, excluding optional items. Use items with {name: *Section*} to create a section.",
						},
					},
					additionalProperties: false,
				},
				strict: true,
			},
		},
	});
	return response.choices[0]?.message?.content ?? "";
}

export async function fetchAndSummarize(url: string): Promise<string> {
	// Hämta innehållet från URL
	logger.info("Fetching url", url);
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`HTTP-fel! Status: ${response.status}`);
	}
	const text = await response.text();

	// Sammanfatta innehållet
	logger.info("Summarizing using LLM", url);
	return await summarizeWithChatLLM(text);
}

export const importUrl = onCall({ secrets, timeoutSeconds, region, cors }, async ({ data }) => {
	try {
		const summary = await fetchAndSummarize(data.url);
		return summary;
	} catch (error) {
		console.error("Ett fel uppstod:", error);
	}
	return null;
});

	
export const importText = onCall({ secrets, timeoutSeconds, region, cors }, async () => {
	try {
		logger.info("Summarizing using LLM");
		const summary = await summarizeWithChatLLM(apiKey.value());
		return summary;
	} catch (error) {
		console.error("Ett fel uppstod:", error);
	}
	return null;
});

export const prefillUpdate = onDocumentWritten({ 
	document: "/veganflora/root/recipies/{id}", 
	timeoutSeconds, region 
}, async ({params}) => {
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
		const current = await root
			.collection("recipies")
			.doc(params.id)
			.get();
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
});
