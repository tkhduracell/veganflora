import { computed, ref } from 'vue'

type Unpacked<T> = T extends (infer U)[] ? U : T;
export const MultiValue = [0.25, 0.5, 1, 2, 3, 4, 5,6, 8, 10, 12, 15, 20]
export type Multi = Unpacked<typeof MultiValue>


export function useMulti() {
  const idx = ref(1)
  const multiplier = computed(() => MultiValue[idx.value])

  function plus() {
    idx.value = Math.max(Math.min(idx.value + 1, MultiValue.length - 1), 0)
  }
  function minus() {
    idx.value = Math.max(Math.min(idx.value - 1, MultiValue.length - 1), 0)
  }

  function prettyMulti(amount: any, multiplier: Multi) {
    const out = (typeof amount === 'string' ? parseFloat(amount.replace(',', '.')) : amount) * multiplier
    if (isNaN(out)) {
      return multiplier > 1 ? `${multiplier} x ${amount}` : amount
    }
    return out
  }

  return { multiplier, minus, plus, prettyMulti }
}
