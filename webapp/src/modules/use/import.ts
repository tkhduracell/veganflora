import { Recipe, Ingredient } from '@/components/types'
import { ref, Ref, unref } from 'vue'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getApp } from 'firebase/app'
import { v4 as uuidv4 } from 'uuid'

export function useImportUrl(recipe: Ref<Recipe>) {
  const app = getApp()
  const functions = getFunctions(app, 'europe-west3')

  const isImporting = ref(false)
  const importUrl = ref('https://yipin.se/recept/vegansk-chokladmousse/')

  async function onImportUrl() {
    if (isImporting.value) return console.warn('Already running...')
    isImporting.value = true
    try {
      const importRecipie = httpsCallable<{ url: string }, string>(functions, 'importRecepie')

      const result = await importRecipie({ url: importUrl.value })
      const imported = JSON.parse(result.data) as Pick<Recipe, 'title' | 'text'> & { ingredients: Omit<Ingredient, 'id'>[] }

      recipe.value = {
        ...recipe.value,
        ingredients: imported.ingredients.map(r => ({ ...r, id: uuidv4() })),
        title: imported.title,
        text: imported.text
      }
    } finally {
      isImporting.value = false
    }
  }

  return { importUrl, onImportUrl, isImporting }
}
