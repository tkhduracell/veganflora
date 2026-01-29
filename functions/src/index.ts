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

import { GoogleGenAI, Type } from "@google/genai";

initializeApp();

const db = getFirestore();
const root = db.collection("veganflora").doc("root");

const randomColor = () =>
	`#${Math.floor(Math.random() * 16777215).toString(16)}`;

async function summarizeWithChatLLM(text: string): Promise<string> {
	const apiKeyValue = apiKey.value();

	const ai = new GoogleGenAI({ apiKey: apiKeyValue });

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
	const USER_PROMPT = `
      Summarize this recipe in Swedish with Swedish units: ${text}
    `.trim();

	const response = await ai.models.generateContent({
		model: "gemini-3-pro-preview",
		contents: USER_PROMPT,
		config: {
			systemInstruction: SYSTEM_PROMPT,
			responseMimeType: "application/json",
			responseSchema: {
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
						description: "Size of the recipe (e.g. 6 portioner, 12 bullar, 9 bars, 3 bitar)",
					},
					image: {
						type: Type.STRING,
						description: "URL to an image of the recipe. Empty string if no image is available.",
					},
					ingredients: {
						type: Type.ARRAY,
						description: "A list of ingredients used in the recipe, excluding optional items.",
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
									description: "The measurement unit for the ingredient (e.g., dl, tsk, msk, gram).",
								},
							},
							propertyOrdering: ["name", "amount", "measure"],
						},
					},
				},
				propertyOrdering: ["title", "size", "image", "text", "ingredients"],
			},
		},
	});

	return response.text ?? "";
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
		logger.error("An error in importUrl:", error);
		throw error;
	}
});

	
export const importText = onCall({ secrets, timeoutSeconds, region, cors }, async ({ data }) => {
	try {
		logger.info("Summarizing using LLM");
		const summary = await summarizeWithChatLLM(data.text);
		return summary;
	} catch (error) {
		logger.error("An error in importText:", error);
		throw error;
	}
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
