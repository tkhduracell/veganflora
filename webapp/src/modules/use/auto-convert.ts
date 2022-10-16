import { onMounted, onUnmounted, reactive, ref, UnwrapRef } from '@vue/composition-api';
import { useLocalStorage } from '@vueuse/core';

import * as firebase from 'firebase/app'
import 'firebase/firestore'

import { Ingredient } from '@/components/types'

export function useAutoConvert() {
  const enabled = useLocalStorage('convert-weight', false)
  const weights = ref<Record<string, { measure: string, weight: number, weight_measure?: string }[]>>({})
  const listeners = reactive({
    weights: () => {}
  })
  onMounted(async () => {
    const db = firebase.firestore()
    listeners.weights = db.collection('veganflora')
      .doc('root')
      .collection('converts')
      .doc('weight')
      .onSnapshot((result) => {
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
      (typeof weight === 'number' ? weight : parseInt(weight ?? '')) *
      (typeof amount === 'number' ? amount : parseInt(amount ?? ''))
    )
  } catch (e) {
    return `${weight} x ${amount}`
  }
}

