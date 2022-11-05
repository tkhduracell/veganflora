import { onMounted, onUnmounted, reactive, ref, UnwrapRef } from 'vue';
import { useLocalStorage } from '@vueuse/core';

import { doc, getFirestore, onSnapshot } from 'firebase/firestore'

import { Ingredient } from '@/components/types'

export function useAutoConvert() {
  const store = getFirestore()
  const enabled = useLocalStorage('convert-weight', false)
  const weights = ref<Record<string, { measure: string, weight: number, weight_measure?: string }[]>>({})
  const listeners = reactive({
    weights: () => {}
  })
  onMounted(async () => {
    const ref = doc(store, 'veganflora', 'root', 'converts', 'weight')
    listeners.weights = onSnapshot(ref, result => {
      weights.value = result.data() as UnwrapRef<typeof weights> ?? {}
    })
  })
  onUnmounted(() => {
    listeners.weights()
  })

  function convert(ingredient: Ingredient): Ingredient {
    const tbl = weights.value
    if (Object.keys(tbl).length === 0) return ingredient
    const key = ingredient.name.toLowerCase()
    if (key in tbl) {
      const item = tbl[key]
      for (const row of item) {
        if (row.measure == ingredient.measure) {
          return { ...ingredient, amount: tryMultiply(row.weight, ingredient.amount), measure: row.weight_measure ?? 'g' }
        }
      }
    }
    return ingredient
  }
  return { enabled, weights, convert }
}
function tryMultiply(weight: number | string | undefined, amount: number | string | undefined): string {
  try {
    return '' + (
      (typeof weight === 'number' ? weight : parseFloat(weight ?? '')) *
      (typeof amount === 'number' ? amount : parseFloat(amount ?? ''))
    ).toFixed(1)
  } catch (e) {
    return `${weight} x ${amount}`
  }
}

