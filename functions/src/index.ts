import {region, logger} from 'firebase-functions';

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import{ defineSecret } from 'firebase-functions/params'

const openAiApiKey = defineSecret('OPENAI_API_KEY');


import OpenAI from "openai";

initializeApp();

const db = getFirestore();
const root = db.collection('veganflora').doc('root')

const randomColor = () => `#${Math.floor(Math.random()*16777215).toString(16)}`

async function summarizeWithChatGPT(text: string): Promise<string> {
    const openai = new OpenAI({
        apiKey: openAiApiKey.value(),
    });

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: [{"text": "You are a helpful AI assistant that can summarize recipes in Swedish and provide them in JSON format.", type: "text"}] },
          { role: "user", content: [{ "text": `Summarize this recipe in Swedish and provide it in JSON format: ${text}`, type: "text" }] }
        ],
        temperature: 0.2,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        response_format: {
          "type": "json_schema",
          "json_schema": {
            "name": "recipe",
            "schema": {
              "type": "object",
              "required": [
                "ingredients",
                "title",
                "text"
              ],
              "properties": {
                "text": {
                  "type": "string",
                  "description": "Instructions for preparing the recipe in Markdown format. No headers just a step-by-step list."
                },
                "title": {
                  "type": "string",
                  "description": "The title of the recipe."
                },
                "ingredients": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": [
                      "name",
                      "amount",
                      "measure"
                    ],
                    "properties": {
                      "name": {
                        "type": "string",
                        "description": "The name of the ingredient."
                      },
                      "amount": {
                        "type": "string",
                        "description": "The quantity of the ingredient needed."
                      },
                      "measure": {
                        "type": "string",
                        "description": "The measurement unit for the ingredient (e.g., tsk, dl, cups, gram)."
                      }
                    },
                    "additionalProperties": false
                  },
                  "description": "A list of ingredients used in the recipe, excluding optional items. Use items with {name: *Section*} to create a section."
                }
              },
              "additionalProperties": false
            },
            "strict": true
          }
        },
      });
    return response.choices[0]?.message?.content ?? ''
}

export async function fetchAndSummarize(url: string): Promise<string> {
    // Hämta innehållet från URL
    logger.info('Fetching url', url)
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP-fel! Status: ${response.status}`);
    }
    const text = await response.text();

    // Sammanfatta innehållet
    logger.info('Summarizing using GPT4', url)
    return await summarizeWithChatGPT(text);
}

export const importUrl = region('europe-west3')
    .runWith({ secrets: [openAiApiKey], timeoutSeconds: 120 })
    .https
    .onCall(async ({url}) => {
        try {
            const summary = await fetchAndSummarize(url)
            return summary
        } catch (error) {
            console.error("Ett fel uppstod:", error);
        }
        return null
    })

export const importText = region('europe-west3')
    .runWith({ secrets: [openAiApiKey], timeoutSeconds: 120 })
    .https
    .onCall(async ({text}) => {
        try {
            logger.info('Summarizing using GPT4')
            const summary = await summarizeWithChatGPT(text)
            return summary
        } catch (error) {
            console.error("Ett fel uppstod:", error);
        }
        return null
    })

export const prefillUpdate = region('europe-west3')
    .firestore
    .document('/veganflora/root/recipies/{id}')
    .onWrite(async (_, ctx) => {
        logger.info(`${ctx.params.id}:onWrite()`);

        type TagInfo = { text: string, color: string }
        type TagKey = string

        type Category = string
        type CompatTags = (TagKey | TagInfo)[]

        const tagsByName = new Map<TagKey, TagInfo>()
        const categorySet = new Set<Category>()

        {
            const { prefill } = await root.get().then(itm => itm.data() as { prefill?: { tags: TagInfo[], categories: Category[] } })
            if (prefill) {
                prefill.tags.forEach(t => tagsByName.set(t.text, t))
                prefill.categories.forEach(c => categorySet.add(c))
            }
        }

        {
            const current = await root.collection('recipies').doc(ctx.params.id).get()
            if (!current.exists) return logger.warn(`Document ${ctx.params.id} does not exist`)

            logger.info(`Updating updated doc with tags`, {  });
            const tags: TagKey[] = (current.data()!.tags as CompatTags).map(t => typeof t === 'string' ? t : t.text)
            await current.ref.update({ tags })
        }

        const cursor = await root.collection('recipies').get()
        cursor.forEach(doc => {
            const { tags, category } = doc.data() as { tags?: CompatTags, category?: Category[] }

            if (!category)  return logger.error(`Document ${doc.id} has no category`)
            categorySet.add(category.join(' / '))

            if (!tags) return logger.warn(`Document ${doc.id} has no tags`)
            tags
                .map(t => typeof t === 'string' ? t : t.text ?? '')
                .filter(tag => tag !== '')
                .filter(tag => !tagsByName.has(tag))
                .forEach(tag => tagsByName.set(tag, { text: tag, color: randomColor() }))

        })

        const tags = [...tagsByName.values()].sort((a,b) => a.text.localeCompare(b.text))
        const categories = [...categorySet.values()].sort()

        logger.info(`Updating prefill`, { tags, categories });
        await root.update({ "prefill.tags": tags, "prefill.categories": categories })
    });
