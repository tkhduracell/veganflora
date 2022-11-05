import { ref, onMounted } from 'vue'
import { AutoTags } from '../tags'
import { doc, getDoc, getFirestore, onSnapshot } from 'firebase/firestore'

type Prefill = {
  tags: string[];
  categories: string[];
}

export function usePrefill () {
  const categories = ref<string[]>([])
  const tags = ref<string[]>([...AutoTags])

  onMounted(async () => {
    const store = getFirestore()

    onSnapshot(doc(store, 'veganflora', 'root'), result => {
      const {prefill} = result.data() as { prefill: Prefill }
      console.log('Loaded prefill: ', prefill)

      tags.value = [...AutoTags, ...prefill.tags]
      categories.value = prefill.categories
    })
  })

  return { tags, categories }
}
