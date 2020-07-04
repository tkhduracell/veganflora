import { ref, onMounted } from '@vue/composition-api'

import * as firebase from 'firebase/app'
import 'firebase/firestore'

import { Recipe, Ingredient } from '@/components/types'

function asArray<V> (result: firebase.firestore.QuerySnapshot): { key: string; value: V }[] {
  const out: { key: string; value: V }[] = []
  result.forEach(itm => out.push({ key: itm.id, value: itm.data() as V }))
  return out
}

export function useRecipe (key: string) {
  const recipe = ref<Recipe>({})

  onMounted(async () => {
    const db = firebase.firestore()
    const recipes = db.collection('veganflora')
      .doc('root')
      .collection('recipies')

    console.log(`Loading recipe ${key} ...`)
    const result = await recipes.doc(key || '').get()
    if (result && result.exists) {
      recipe.value = result.data() as Recipe
    } else {
      console.log('Recpie not found, starting with clean slate')
    }
  })

  async function onSave () {
    if (!recipe.value) return

    const copy = JSON.parse(JSON.stringify(recipe.value))
    delete copy.key

    await firebase.firestore()
      .collection('veganflora')
      .doc('root')
      .collection('recipies')
      .doc(key)
      .set(copy, { merge: false })
  }

  return { recipe, onSave }
}

export function useRecipes () {
  const recipes = ref<(Recipe)[]>([])
  const nul = { key: '', size: '', title: '', text: '', category: [] as string[], ingredients: [] as Ingredient[] } as Recipe

  onMounted(async () => {
    const db = firebase.firestore()
    const result = db.collection('veganflora')
      .doc('root')
      .collection('recipies')

    console.log('Loading recipes ...')
    recipes.value = asArray<Recipe>(await result.get())
      .map(itm => ({ ...itm.value, key: itm.key }))
  })

  function findRecipe (key: string): Recipe {
    return recipes.value.find(r => r.key === key) || nul
  }

  return { recipes, findRecipe }
}
