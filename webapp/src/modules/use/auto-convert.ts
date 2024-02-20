import { onMounted, onUnmounted, reactive, ref, UnwrapRef } from 'vue'
import { useLocalStorage } from '@vueuse/core'

import { doc, getFirestore, onSnapshot } from 'firebase/firestore'

import { Ingredient } from '@/components/types'
import { normalizeValue } from '../ingredients'

export type ConvertLine = { measure: string, weight: number, weight_measure?: string }
export type Convert = { name: string, lines: { [key :string]: ConvertLine } }
export type Converts = { [key :string]: Convert }

export function useAutoConvert () {
  const store = getFirestore()
  const enabled = useLocalStorage('convert-weight', false)
  const weights = ref<Converts>({})
  const listeners = reactive({
    // @eslint-disable-next-line @typescript-eslint/no-empty-function
    weights: () => { /** */ }
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

  function convert (ingredient: Ingredient): Ingredient {
    const tbl = weights.value
    if (Object.keys(tbl).length === 0) return ingredient
    const norml = (s?: string) => (s ?? '').toLocaleLowerCase().trim()
    for (const { lines, name } of Object.values(tbl)) {
      // Prefer exact match
      if (norml(name) === norml(ingredient.name)) {
        for (const { measure, weight, weight_measure } of Object.values(lines)) {
          // Prefer exact match
          if (norml(measure) === norml(ingredient.measure)) {
            return { ...ingredient, amount: tryMultiply(weight, ingredient.amount), measure: weight_measure ?? 'g' }
          }
        }
      }
    }
    return ingredient
  }
  return { enabled, weights, convert }
}
function tryMultiply (weight: number | string | undefined, amount: number | string | undefined): string {
  try {
    const nomalized = normalizeValue(amount ?? '')
    return '' + (
      (typeof weight === 'number' ? weight : parseFloat(weight ?? '')) *
      (typeof nomalized === 'number' ? nomalized : parseFloat(nomalized.replace(',', '.')))
    ).toFixed(1)
  } catch (e) {
    return `${weight} x ${amount}`
  }
}
