import type { Recipe, Ingredient } from "@/components/types"
import { ref, computed, type Ref, unref, onUnmounted } from "vue"
import { getFunctions, httpsCallable } from "firebase/functions"
import { getApp } from "firebase/app"
import { getStorage, ref as storageRef, uploadBytesResumable } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"

const PROGRESS_MESSAGES = [
	"Analyserar recept...",
	"Identifierar ingredienser...",
	"Konverterar till svenska mått...",
	"Strukturerar instruktioner...",
	"Rensar bort onödiga detaljer...",
	"Formaterar receptet...",
	"Sammanställer slutresultat...",
	"Dubbelkollar mängder...",
	"Finjusterar stegen...",
	"Nästan klar...",
]

/** How long the Storage SDK may keep retrying a failing upload request before giving up. */
const UPLOAD_RETRY_TIMEOUT_MS = 30_000
/** How long the upload may run without any progress before we treat it as stuck. */
const UPLOAD_STALL_TIMEOUT_MS = 45_000

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
	const progressMessage = ref<string | null>(null)
	let progressInterval: ReturnType<typeof setInterval> | null = null

	const importErrorMessage = computed(() => {
		const error = importError.value
		if (!error) return null
		const code = (error as { code?: string }).code
		switch (code) {
			case "storage/unauthorized":
			case "storage/unauthenticated":
				return "Du saknar behörighet att ladda upp bilder. Logga in igen och försök på nytt."
			case "storage/retry-limit-exceeded":
				return "Uppladdningen tog för lång tid. Kontrollera nätverket och försök igen."
			case "storage/canceled":
				return "Uppladdningen avbröts."
			case "storage/unknown":
				return `Bildlagringen svarar inte (${error.message}). Kontrollera att Firebase Storage är korrekt kopplat till projektet.`
			default:
				return error.message || String(error)
		}
	})

	function startProgressMessages() {
		let index = 0
		progressMessage.value = PROGRESS_MESSAGES[0]
		progressInterval = setInterval(() => {
			index = (index + 1) % PROGRESS_MESSAGES.length
			progressMessage.value = PROGRESS_MESSAGES[index]
		}, 2500)
	}

	function stopProgressMessages() {
		if (progressInterval) {
			clearInterval(progressInterval)
			progressInterval = null
		}
		progressMessage.value = null
	}

	onUnmounted(stopProgressMessages)

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
		importPhase.value = "processing"
		startProgressMessages()
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
			importPhase.value = null
			stopProgressMessages()
		}
	}

	async function onImportText() {
		if (isImporting.value) return console.warn("Already running...")
		isImporting.value = true
		importError.value = undefined
		importPhase.value = "processing"
		startProgressMessages()
		try {
			const importRecipie = httpsCallable<{ text: string }, string>(functions, "importText")

			const result = await importRecipie({ text: importText.value })
			const imported = JSON.parse(result.data) as Pick<Recipe, "title" | "text" | "size"> & {
				ingredients: Omit<Ingredient, "id">[]
			}

			recipe.value = {
				...recipe.value,
				ingredients: imported.ingredients.map((r) => ({ ...r, id: uuidv4() })),
				title: imported.title,
				text: imported.text,
				size: imported.size,
			}
			importText.value = ""
		} catch (e: unknown) {
			importError.value = e as Error
			console.error("Unable to import", e)
		} finally {
			isImporting.value = false
			importPhase.value = null
			stopProgressMessages()
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
			// Fail fast instead of silently retrying for the SDK default of two minutes
			storage.maxUploadRetryTime = UPLOAD_RETRY_TIMEOUT_MS
			const path = `imports/${Date.now()}_${file.name}`
			const fileRef = storageRef(storage, path)
			const uploadTask = uploadBytesResumable(fileRef, file, { contentType: file.type })

			await new Promise<void>((resolve, reject) => {
				// The SDK keeps a stalled upload alive without emitting anything, so watch it ourselves
				let stallTimer: ReturnType<typeof setTimeout>
				const failIfStalled = () => {
					stallTimer = setTimeout(() => {
						uploadTask.cancel()
						reject(new Error(`Uppladdningen fastnade på ${uploadProgress.value}%. Kontrollera nätverket och försök igen.`))
					}, UPLOAD_STALL_TIMEOUT_MS)
				}
				const settle = (fn: () => void) => {
					clearTimeout(stallTimer)
					fn()
				}

				failIfStalled()
				uploadTask.on(
					"state_changed",
					(snapshot) => {
						uploadProgress.value = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
						clearTimeout(stallTimer)
						failIfStalled()
					},
					(error) => settle(() => reject(error)),
					() => settle(resolve),
				)
			})

			importPhase.value = "processing"
			startProgressMessages()

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
			stopProgressMessages()
		}
	}

	return {
		importUrl,
		isImporting,
		importText,
		importImageFile,
		onImport,
		importError,
		importErrorMessage,
		uploadProgress,
		importPhase,
		progressMessage,
	}
}
