import type { Recipe, Ingredient } from "@/components/types"
import { ref, type Ref, unref } from "vue"
import { getFunctions, httpsCallable } from "firebase/functions"
import { getApp } from "firebase/app"
import { getStorage, ref as storageRef, uploadBytesResumable } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"

export function useImportUrl(recipe: Ref<Recipe>) {
	const app = getApp()
	const functions = getFunctions(app, "europe-north1")

	const isImporting = ref(false)
	const importUrl = ref("")
	const importText = ref("")
	const importImageFile = ref<File | null>(null)
	const importError = ref<Error>()
	const uploadProgress = ref(0)
	const importPhase = ref<"uploading" | "processing" | null>(null)

	async function onImport() {
		if (importUrl.value !== "") {
			return await onImportUrl()
		}
		if (importText.value !== "") {
			return await onImportText()
		}
		if (importImageFile.value) {
			return await onImportImage()
		}
		console.warn("Nothing to import")
	}

	async function onImportUrl() {
		if (isImporting.value) return console.warn("Already running...")
		isImporting.value = true
		importError.value = undefined
		try {
			const importRecipie = httpsCallable<{ url: string }, string>(functions, "importUrl")

			const result = await importRecipie({ url: importUrl.value })
			if (result.data === null) {
				throw new Error("No data returned from API")
			}
			type RecipeDetails = Pick<Recipe, "title" | "text" | "size"> & {
				ingredients: Omit<Ingredient, "id">[]
			}

			const imported = JSON.parse(result.data) as RecipeDetails

			recipe.value = {
				...recipe.value,
				ingredients: imported.ingredients.map((r) => ({ ...r, id: uuidv4() })),
				title: imported.title,
				text: imported.text,
				size: imported.size,
			}
			importUrl.value = ""
		} catch (e: unknown) {
			importError.value = e as Error
			console.error("Unable to import, propbably a backend error, check the logs...", e)
		} finally {
			isImporting.value = false
		}
	}

	async function onImportText() {
		if (isImporting.value) return console.warn("Already running...")
		isImporting.value = true
		importError.value = undefined
		try {
			const importRecipie = httpsCallable<{ text: string }, string>(functions, "importText")

			const result = await importRecipie({ text: importText.value })
			const imported = JSON.parse(result.data) as Pick<Recipe, "title" | "text"> & {
				ingredients: Omit<Ingredient, "id">[]
			}

			recipe.value = {
				...recipe.value,
				ingredients: imported.ingredients.map((r) => ({ ...r, id: uuidv4() })),
				title: imported.title,
				text: imported.text,
			}
			importText.value = ""
		} catch (e: unknown) {
			importError.value = e as Error
			console.error("Unable to import", e)
		} finally {
			isImporting.value = false
		}
	}

	async function onImportImage() {
		const file = importImageFile.value
		if (!file) return console.warn("No image file selected")
		if (isImporting.value) return console.warn("Already running...")

		isImporting.value = true
		importError.value = undefined
		uploadProgress.value = 0
		importPhase.value = "uploading"

		try {
			const storage = getStorage()
			const path = `imports/${Date.now()}_${file.name}`
			const fileRef = storageRef(storage, path)
			const uploadTask = uploadBytesResumable(fileRef, file, { contentType: file.type })

			await new Promise<void>((resolve, reject) => {
				uploadTask.on(
					"state_changed",
					(snapshot) => {
						uploadProgress.value = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
					},
					(error) => reject(error),
					() => resolve(),
				)
			})

			importPhase.value = "processing"

			const importRecipie = httpsCallable<{ storagePath: string; mimeType: string }, string>(functions, "importImage")
			const result = await importRecipie({ storagePath: path, mimeType: file.type })

			type RecipeDetails = Pick<Recipe, "title" | "text" | "size"> & {
				ingredients: Omit<Ingredient, "id">[]
			}
			const imported = JSON.parse(result.data) as RecipeDetails

			recipe.value = {
				...recipe.value,
				ingredients: imported.ingredients.map((r) => ({ ...r, id: uuidv4() })),
				title: imported.title,
				text: imported.text,
				size: imported.size,
			}
			importImageFile.value = null
		} catch (e: unknown) {
			importError.value = e as Error
			console.error("Unable to import image", e)
		} finally {
			isImporting.value = false
			importPhase.value = null
			uploadProgress.value = 0
		}
	}

	return { importUrl, isImporting, importText, importImageFile, onImport, importError, uploadProgress, importPhase }
}
