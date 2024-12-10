import { Recipe, Ingredient } from '@/components/types'
import { ref, Ref, unref } from 'vue'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getApp } from 'firebase/app'
import { v4 as uuidv4 } from 'uuid'

export function useImportUrl(recipe: Ref<Recipe>) {
  const app = getApp()
  const functions = getFunctions(app, 'europe-west3')

  const isImporting = ref(false)
  const importUrl = ref('')
  const importText = ref('')
  const importError = ref<Error>()

  async function onImport() {
    if (importUrl.value !== '') {
      return await onImportUrl()
    }
    if (importText.value !== '') {
      return await onImportText()
    }
    console.warn('Nothing to import')
  }

  async function onImportUrl() {
    if (isImporting.value) return console.warn('Already running...')
    isImporting.value = true
    importError.value = undefined
    try {
      const importRecipie = httpsCallable<{ url: string }, string>(functions, 'importUrl')

      const result = await importRecipie({ url: importUrl.value })
      const imported = JSON.parse(result.data) as Pick<Recipe, 'title' | 'text' | 'size'> & { ingredients: Omit<Ingredient, 'id'>[] }

      recipe.value = {
        ...recipe.value,
        ingredients: imported.ingredients.map(r => ({ ...r, id: uuidv4() })),
        title: imported.title,
        text: imported.text,
        size: imported.size
      }
      importUrl.value = ''
    } catch (e: unknown) {
      importError.value = e as Error
      console.error('Unable to import', e)
    } finally {
      isImporting.value = false
    }
  }

  async function onImportText() {
    if (isImporting.value) return console.warn('Already running...')
    isImporting.value = true
    importError.value = undefined
    try {
      const importRecipie = httpsCallable<{ text: string }, string>(functions, 'importText')

      const result = await importRecipie({ text: importText.value })
      const imported = JSON.parse(result.data) as Pick<Recipe, 'title' | 'text'> & { ingredients: Omit<Ingredient, 'id'>[] }

      recipe.value = {
        ...recipe.value,
        ingredients: imported.ingredients.map(r => ({ ...r, id: uuidv4() })),
        title: imported.title,
        text: imported.text
      }
      importText.value = ''
    } catch (e: unknown) {
      importError.value = e as Error
      console.error('Unable to import', e)
    } finally {
      isImporting.value = false
    }
  }

  return { importUrl, isImporting, importText, onImport, importError }
}
