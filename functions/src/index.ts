import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsOptions, onCall, onRequest } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
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
