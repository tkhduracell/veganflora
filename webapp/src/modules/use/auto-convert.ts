/* eslint-disable camelcase */
import { onMounted, onUnmounted, reactive, ref, type UnwrapRef } from "vue"
import { useLocalStorage } from "@vueuse/core"

import { doc, getFirestore, onSnapshot } from "firebase/firestore"

import type { Ingredient } from "@/components/types"
import { normalizeValue } from "../ingredients"

export interface Weights {
	[ingredient: string]: { unit: string; grams: number }[]
}

export function useAutoConvert() {
	const store = getFirestore()
	const enabled = useLocalStorage("convert-weight-v2", false)
	const weights = ref<Weights>({})

	const listeners = reactive({
		// @eslint-disable-next-line @typescript-eslint/no-empty-function
		weights: () => {
			/** */
		},
	})

	onMounted(async () => {
		const ref = doc(store, "veganflora", "root", "converts", "weight-v2")
		listeners.weights = onSnapshot(ref, (result) => {
			weights.value = (result.data() as UnwrapRef<typeof weights>) ?? {}
		})
	})
	onUnmounted(() => {
		listeners.weights()
	})

	function convert(ingredient: Ingredient): Ingredient {
		const tbl = weights.value
		if (Object.keys(tbl).length === 0) return ingredient
		const norml = (s?: string) => (s ?? "").toLocaleLowerCase().trim()

		const grams =
			weights.value[norml(ingredient.name)]?.find((units) => units.unit === ingredient.measure)?.grams ?? null

		if (grams !== null) {
			return {
				...ingredient,
				amount: tryMultiply(grams, ingredient.amount),
				measure: "g",
			}
		}
		return ingredient
	}
	return { enabled, weights, convert }
}
function tryMultiply(weight: number | string | undefined, amount: number | string | undefined): string {
	try {
		const nomalized = normalizeValue(amount ?? "")
		return (
			`${(
				(typeof weight === "number" ? weight : Number.parseFloat(weight ?? "")) *
				(typeof nomalized === "number" ? nomalized : Number.parseFloat(nomalized.replace(",", ".")))
			).toFixed(1)}`
		)
	} catch (_e) {
		return `${weight} x ${amount}`
	}
}
