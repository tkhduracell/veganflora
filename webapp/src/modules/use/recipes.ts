import { ref, onMounted, onUnmounted, Ref } from 'vue'

import { collection, deleteDoc, doc, getDoc, getFirestore, onSnapshot, QuerySnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { getStorage, ref as imageRef, uploadBytesResumable, UploadTask } from 'firebase/storage'

import { Recipe, Tag } from '@/components/types'

import { autoTag } from '../../modules/tags'

function asArray<V> (result: QuerySnapshot): { key: string; value: V }[] {
  const out: { key: string; value: V }[] = []
  result.forEach(itm => out.push({ key: itm.id, value: itm.data() as V }))
  return out
}

async function remove (key: string) {
  const db = getFirestore()
  const recipe = doc(db, 'veganflora', 'root', 'recipies', key)
  await deleteDoc(recipe)
}

export function useRecipe (key: string) {
  const empty = {
    title: '',
    category: [],
    tags: [],
    ingredients: [],
    key: '',
    size: '',
    text: ''
  }
  const recipe = ref<Recipe>(empty)
  const imageUpload = ref<UploadTask>()

  onMounted(async () => {
    const store = getFirestore()

    if (key) {
      console.log(`Loading recipe ${key} ...`)
      const ref = doc(store, 'veganflora', 'root', 'recipies', key ?? 'does-not-exist')
      const result = await getDoc(ref)
      if (result && result.exists()) {
        recipe.value = result.data() as Recipe
      } else {
        console.log('Recpie not found, starting with clean slate')
      }
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
    const { key, created_at, image, ...rest } = recipe.value
    const data = {
      // Timestamp need reconstruct after json clone
      created_at: !created_at ? serverTimestamp() : new Timestamp(created_at.seconds, created_at.nanoseconds),
      updated_at: serverTimestamp(),
      ...rest
    }

    const savekey = key || safekey(data.title, data.category)

    if (savekey) {
      if (recipe.value.image) {
        const storage = getStorage()
        const image = imageRef(storage, `images/${savekey}.jpg`)
        imageUpload.value = uploadBytesResumable(image, recipe.value.image, { contentType: 'image/jpeg' })
      }

      const store = getFirestore()
      const document = doc(store, 'veganflora', 'root', 'recipies', savekey)
      await setDoc(document, data, { merge: false })
    }
    return { savekey }
  }

  return { recipe, onSave, remove: () => remove(key) }
}

export type Recipes = {recipes: Ref<Recipe[] | undefined>; findRecipe: (key: string) => Recipe | undefined; remove: (key: string) => void}
export function useRecipes (): Recipes {
  const recipes = ref<Recipe[] | undefined>(undefined)
  const close = ref<() => void>()

  onMounted(async () => {
    const store = getFirestore()
    const col = collection(store, 'veganflora', 'root', 'recipies')

    type StoreRecipie = Omit<Recipe, 'tags'> & { tags: (string | Tag)[] }
    function stringToBadge<T extends { text: string }> (x: T | string): T {
      return typeof x === 'string' ? { text: x } as T : x
    }

    const fancyTag = ({ tags, ...rest }: StoreRecipie) => ({ ...rest, tags: tags?.map(stringToBadge) })

    close.value = onSnapshot(col, async (result) => {
      console.log('Loading recipes ...')
      recipes.value = asArray<StoreRecipie>(result)
        .map(itm => ({ ...itm.value, key: itm.key }))
        .map(fancyTag)
        .map(autoTag)
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
