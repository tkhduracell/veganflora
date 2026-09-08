import type { Firestore } from "firebase-admin/firestore"

import { RecipeExistsError, RecipeNotFoundError, RecipeRepository } from "../src/repository.js"
import { clearRecipes, closeDb, emulatorDb } from "./emulator.js"

const sample = {
	title: "Linssoppa",
	size: "4 portioner",
	ingredients: [{ name: "röda linser", amount: "2", measure: "dl" }],
	text: "Koka linserna.",
	category: ["Soppor"],
	tags: ["snabbt"],
}

describe("RecipeRepository", () => {
	let db: Firestore
	let repo: RecipeRepository

	beforeAll(() => {
		db = emulatorDb()
		repo = new RecipeRepository(db)
	})

	beforeEach(async () => {
		await clearRecipes(db)
	})

	afterAll(async () => {
		await closeDb()
	})

	it("creates a recipe and returns its derived id", async () => {
		const { id } = await repo.createRecipe(sample)
		expect(id).toBe("Soppor\\Linssoppa")
	})

	it("reads back a created recipe", async () => {
		await repo.createRecipe(sample)
		const found = await repo.getRecipe("Soppor\\Linssoppa")
		expect(found?.title).toBe("Linssoppa")
		expect(found?.ingredients).toEqual(sample.ingredients)
	})

	it("returns null for a missing recipe", async () => {
		expect(await repo.getRecipe("Soppor\\Saknas")).toBeNull()
	})

	it("refuses to overwrite an existing recipe", async () => {
		await repo.createRecipe(sample)
		await expect(repo.createRecipe(sample)).rejects.toThrow(RecipeExistsError)
	})

	it("merges only the named fields on update", async () => {
		await repo.createRecipe(sample)
		await repo.updateRecipe("Soppor\\Linssoppa", { size: "6 portioner" })
		const found = await repo.getRecipe("Soppor\\Linssoppa")
		expect(found?.size).toBe("6 portioner")
		expect(found?.title).toBe("Linssoppa")
		expect(found?.ingredients).toEqual(sample.ingredients)
	})

	it("throws when updating a missing recipe", async () => {
		await expect(repo.updateRecipe("Soppor\\Saknas", { size: "1" })).rejects.toThrow(RecipeNotFoundError)
	})

	it("preserves the embedding field across an update", async () => {
		await repo.createRecipe(sample)
		const ref = db.collection("veganflora").doc("root").collection("recipies").doc("Soppor\\Linssoppa")
		await ref.update({ embeddingHash: "deadbeef" })
		await repo.updateRecipe("Soppor\\Linssoppa", { size: "8 portioner" })
		const after = await ref.get()
		expect(after.data()?.embeddingHash).toBe("deadbeef")
	})

	it("ignores non-writable fields in an update patch", async () => {
		await repo.createRecipe(sample)
		await repo.updateRecipe("Soppor\\Linssoppa", { embeddingHash: "hacked" } as never)
		const found = await repo.getRecipe("Soppor\\Linssoppa")
		expect(found?.embeddingHash).toBeUndefined()
	})

	it("lists recipes filtered by tag", async () => {
		await repo.createRecipe(sample)
		await repo.createRecipe({ ...sample, title: "Ärtsoppa", tags: ["långkok"] })
		const { recipes } = await repo.listRecipes({ tag: "snabbt", limit: 10 })
		expect(recipes.map((r) => r.title)).toEqual(["Linssoppa"])
	})

	it("lists recipes filtered by category", async () => {
		await repo.createRecipe(sample)
		await repo.createRecipe({ ...sample, title: "Pannkakor", category: ["Efterrätter"] })
		const { recipes } = await repo.listRecipes({ category: "Soppor", limit: 10 })
		expect(recipes.map((r) => r.title)).toEqual(["Linssoppa"])
	})

	it("paginates with a cursor", async () => {
		await repo.createRecipe({ ...sample, title: "Alfa" })
		await repo.createRecipe({ ...sample, title: "Beta" })
		const first = await repo.listRecipes({ limit: 1 })
		expect(first.recipes).toHaveLength(1)
		expect(first.nextCursor).not.toBeNull()

		const second = await repo.listRecipes({ limit: 1, cursor: first.nextCursor as string })
		expect(second.recipes).toHaveLength(1)
		expect(second.recipes[0].id).not.toBe(first.recipes[0].id)
	})

	it("returns a null cursor on the last page", async () => {
		await repo.createRecipe(sample)
		const { nextCursor } = await repo.listRecipes({ limit: 10 })
		expect(nextCursor).toBeNull()
	})
})
