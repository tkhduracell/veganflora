import type { Firestore } from "firebase-admin/firestore"

import { recipeDocId } from "./recipe-id.js"
import type { Recipe, RecipeSummary, StoredRecipe } from "./types.js"

export class RecipeExistsError extends Error {}
export class RecipeNotFoundError extends Error {}

/** Fields a client may write. `embedding` and `embeddingHash` are absent on purpose. */
const WRITABLE_FIELDS = ["title", "size", "ingredients", "text", "category", "tags", "image"] as const

export class RecipeRepository {
	constructor(private readonly db: Firestore) {}

	private get collection() {
		return this.db.collection("veganflora").doc("root").collection("recipies")
	}

	async getRecipe(id: string): Promise<({ id: string } & StoredRecipe) | null> {
		const doc = await this.collection.doc(id).get()
		if (!doc.exists) return null
		return { id: doc.id, ...(doc.data() as StoredRecipe) }
	}

	async listRecipes(opts: {
		category?: string
		tag?: string
		limit: number
		cursor?: string
	}): Promise<{ recipes: RecipeSummary[]; nextCursor: string | null }> {
		let query = this.collection.orderBy("__name__").limit(opts.limit + 1)
		if (opts.category) query = query.where("category", "array-contains", opts.category)
		if (opts.tag) query = query.where("tags", "array-contains", opts.tag)
		if (opts.cursor) query = query.startAfter(this.collection.doc(opts.cursor))

		const snapshot = await query.get()
		const docs = snapshot.docs.slice(0, opts.limit)
		const hasMore = snapshot.docs.length > opts.limit

		return {
			recipes: docs.map((d) => {
				const data = d.data() as StoredRecipe
				return { id: d.id, title: data.title, category: data.category ?? [], tags: data.tags ?? [] }
			}),
			nextCursor: hasMore && docs.length > 0 ? docs[docs.length - 1].id : null,
		}
	}

	async createRecipe(recipe: Recipe): Promise<{ id: string }> {
		const id = recipeDocId(recipe.category, recipe.title)
		const ref = this.collection.doc(id)
		const existing = await ref.get()
		if (existing.exists) {
			throw new RecipeExistsError(`A recipe already exists at "${id}". Use update_recipe to change it.`)
		}
		await ref.set(this.writableOnly(recipe))
		return { id }
	}

	async updateRecipe(id: string, patch: Partial<Recipe>): Promise<void> {
		const ref = this.collection.doc(id)
		const existing = await ref.get()
		if (!existing.exists) throw new RecipeNotFoundError(`No recipe with id "${id}".`)

		const fields = this.writableOnly(patch)
		if (Object.keys(fields).length === 0) return
		// update() merges: fields not named here keep their stored values,
		// including embedding and embeddingHash which the trigger owns.
		await ref.update(fields)
	}

	async searchByVector(queryEmbedding: number[], limit: number): Promise<Array<RecipeSummary & { distance: number }>> {
		const snapshot = await this.collection
			.findNearest({
				vectorField: "embedding",
				queryVector: queryEmbedding,
				limit,
				distanceMeasure: "COSINE",
				distanceResultField: "vector_distance",
			})
			.get()

		return snapshot.docs.map((d) => {
			const data = d.data() as StoredRecipe & { vector_distance: number }
			return {
				id: d.id,
				title: data.title,
				category: data.category ?? [],
				tags: data.tags ?? [],
				distance: data.vector_distance,
			}
		})
	}

	private writableOnly(input: Partial<Recipe>): Record<string, unknown> {
		const out: Record<string, unknown> = {}
		for (const key of WRITABLE_FIELDS) {
			if (input[key] !== undefined) out[key] = input[key]
		}
		return out
	}
}
