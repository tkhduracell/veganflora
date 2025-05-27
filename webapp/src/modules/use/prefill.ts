import { ref, onMounted } from "vue"
import { AutoTags } from "../tags"
import { doc, getDoc, getFirestore, onSnapshot } from "firebase/firestore"
import type { Recipe } from "@/components/types"

type Prefill = {
	tags: Exclude<Recipe["tags"], undefined>
	categories: Recipe["category"]
}

export function usePrefill() {
	const categories = ref<Prefill["categories"]>([])
	const tags = ref<Prefill["tags"]>([...AutoTags.map((x) => ({ text: x, color: "" }))])

	onMounted(async () => {
		const store = getFirestore()

		onSnapshot(doc(store, "veganflora", "root"), (result) => {
			const { prefill } = result.data() as { prefill: Prefill }
			console.log("Loaded prefill: ", prefill)

			tags.value = [...AutoTags.map((x) => ({ text: x, color: "" })), ...prefill.tags]
			categories.value = prefill.categories
		})
	})

	return { tags, categories }
}
