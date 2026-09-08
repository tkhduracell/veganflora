import { initializeApp } from "firebase-admin/app"
import { FieldValue, getFirestore } from "firebase-admin/firestore"

import { contentHash, embeddingText } from "../src/embedding-content.js"
import { GeminiEmbedder } from "../src/embeddings.js"
import type { StoredRecipe } from "../src/types.js"

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) throw new Error("Missing GEMINI_API_KEY")

const dryRun = process.argv.includes("--dry-run")

initializeApp()
const db = getFirestore()
const embedder = new GeminiEmbedder(apiKey)

async function main() {
	const snapshot = await db.collection("veganflora").doc("root").collection("recipies").get()
	console.log(`Found ${snapshot.size} recipes${dryRun ? " (dry run)" : ""}`)

	let embedded = 0
	let skipped = 0
	let failed = 0

	for (const doc of snapshot.docs) {
		const recipe = doc.data() as StoredRecipe
		if (!recipe.title || !recipe.text) {
			console.warn(`SKIP ${doc.id}: missing title or text`)
			skipped++
			continue
		}

		const text = embeddingText({
			title: recipe.title,
			ingredients: recipe.ingredients ?? [],
			text: recipe.text,
		})
		const hash = contentHash(text)

		if (recipe.embeddingHash === hash) {
			skipped++
			continue
		}

		if (dryRun) {
			console.log(`WOULD EMBED ${doc.id}`)
			embedded++
			continue
		}

		try {
			const vector = await embedder.embed(text)
			await doc.ref.update({ embedding: FieldValue.vector(vector), embeddingHash: hash })
			console.log(`EMBEDDED ${doc.id}`)
			embedded++
		} catch (err) {
			// Keep going: one bad document must not strand the rest. Re-running
			// the script picks up whatever failed, since it is idempotent.
			console.error(`FAILED ${doc.id}: ${(err as Error).message}`)
			failed++
		}
	}

	console.log(`Done. embedded=${embedded} skipped=${skipped} failed=${failed}`)
	if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
