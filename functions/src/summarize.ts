import { GoogleGenAI, Type } from "@google/genai";
import { logger } from "firebase-functions";

export async function summarizeWithChatLLM(
	text: string,
	geminiApiKey: string,
): Promise<string> {
	const ai = new GoogleGenAI({ apiKey: geminiApiKey });

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
			},
		},
	});

	return response.text ?? "";
}

export async function fetchAndSummarize(
	url: string,
	geminiApiKey: string,
): Promise<string> {
	logger.info("Fetching url", url);
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`HTTP-fel! Status: ${response.status}`);
	}
	const text = await response.text();

	logger.info("Summarizing using LLM", url);
	return await summarizeWithChatLLM(text, geminiApiKey);
}
