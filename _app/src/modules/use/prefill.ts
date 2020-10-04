import { ref, onMounted } from '@vue/composition-api'

import * as firebase from 'firebase/app'
import 'firebase/firestore'
import { Categories } from '../tags'

type Prefill = {
  tags: string[];
  categories: string[];
}

export function usePrefill () {
  const categories = ref<string[]>([])
  const tags = ref<string[]>([...Categories])

  onMounted(async () => {
    const db = firebase.firestore()

    const document = await db.collection('veganflora')
      .doc('root')
      .get()

    const { prefill } = document.data() as { prefill: Prefill }

    tags.value = [...Categories, ...prefill.tags]
    categories.value = prefill.categories

    console.log('Loaded prefill: ', prefill)
  })

  return { tags, categories }
}
