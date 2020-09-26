import { ref } from '@vue/composition-api'
import { filter } from 'vue/types/umd'
import { usePrefill } from './prefill'

export function useTagFilter() {
  const { tags } = usePrefill()
  const filter = ref<string[]>([])

  return { tags, filter }
}
