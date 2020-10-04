import { ref, onMounted, onUnmounted, Ref } from '@vue/composition-api'

import * as firebase from 'firebase/app'
import 'firebase/firestore'

import { Recipe } from '@/components/types'

function asArray<V> (result: firebase.firestore.QuerySnapshot): { key: string; value: V }[] {
  const out: { key: string; value: V }[] = []
  result.forEach(itm => out.push({ key: itm.id, value: itm.data() as V }))
  return out
}

function remove (key: string) {
  const db = firebase.firestore()
  debugger
  return db.collection('veganflora')
    .doc('root')
    .collection('recipies')
    .doc(key)
    .delete()
}

export function useRecipe (key: string) {
  const recipe = ref<Recipe>({})

  onMounted(async () => {
    const db = firebase.firestore()
    const recipes = db.collection('veganflora')
      .doc('root')
      .collection('recipies')

    console.log(`Loading recipe ${key} ...`)
    const result = await recipes.doc(key || 'does-not-exist').get()
    if (result && result.exists) {
      recipe.value = result.data() as Recipe
    } else {
      console.log('Recpie not found, starting with clean slate')
    }
  })

  function safekey (title: string, cats: string[]): string {
    const safe = (str: string) => str.replace(/\//gi, '\\')
      .replace(/ö/gi, 'oe')
      .replace(/ä/gi, 'ae')
      .replace(/å/gi, 'aa')
      .replace(/[\W]+/gi, '_')

    const safename = safe(title)
    const prefix = cats.map(s => safe(s).replace(/[^\wåäö]+/gi, '_')).join('\\')
    return `${prefix}\\${safename}`
  }

  async function onSave () {
    if (!recipe.value) return
    const copy = JSON.parse(JSON.stringify(recipe.value))

    delete copy.key

    // Timestamp need reconstruct after json clone
    copy.created_at = !copy.created_at
      ? firebase.firestore.FieldValue.serverTimestamp()
      : new firebase.firestore.Timestamp(copy.created_at.seconds, copy.created_at.nanoseconds)

    const savekey = key || safekey(copy.title, copy.category)

    await firebase.firestore()
      .collection('veganflora')
      .doc('root')
      .collection('recipies')
      .doc(savekey)
      .set({
        ...copy,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: false })
  }

  return { recipe, onSave, remove: () => remove(key) }
}

export type Recipes = {recipes: Ref<Recipe[] | undefined>; findRecipe: (key: string) => Recipe | undefined; remove: (key: string) => void}
export function useRecipes (): Recipes {
  const recipes = ref<Recipe[] | undefined>(undefined)
  const close = ref<() => void>()

  onMounted(async () => {
    const db = firebase.firestore()
    const result = db.collection('veganflora')
      .doc('root')
      .collection('recipies')

    close.value = result.onSnapshot(async () => {
      console.log('Loading recipes ...')
      recipes.value = asArray<Recipe>(await result.get())
        .map(itm => ({ ...itm.value, key: itm.key }))
    })
  })

  onUnmounted(() => {
    if (close.value) close.value()
  })

  function findRecipe (key: string): Recipe | undefined {
    return recipes.value ? recipes.value.find(r => r.key === key) : undefined
  }

  return { recipes, findRecipe, remove }
}
