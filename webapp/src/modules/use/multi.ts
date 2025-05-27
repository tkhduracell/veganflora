import { computed, ref } from "vue"

type Unpacked<T> = T extends (infer U)[] ? U : T
export const MultiValue = [0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]
export type Multi = Unpacked<typeof MultiValue>

export function useMulti() {
	const idx = ref(MultiValue.findIndex((p) => p === 1))
	const multiplier = computed(() => MultiValue[idx.value])

	function plus() {
		idx.value = Math.max(Math.min(idx.value + 1, MultiValue.length - 1), 0)
	}
	function minus() {
		idx.value = Math.max(Math.min(idx.value - 1, MultiValue.length - 1), 0)
	}

	function prettyMulti(amount: string | number, multiplier: Multi) {
		const out = (typeof amount === "string" ? Number.parseFloat(amount.replace(",", ".")) : amount) * multiplier
		if (Number.isNaN(out)) {
			return multiplier > 1 ? `${multiplier} x ${amount}` : amount
		}
		return out
	}

	return { multiplier, minus, plus, prettyMulti }
}
