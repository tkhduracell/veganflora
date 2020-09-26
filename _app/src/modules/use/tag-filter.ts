import { Ref, ref, watch } from '@vue/composition-api'

import { usePrefill } from './prefill'

export function useTagFilter<T>(input: Ref<T[] | undefined>, provider: (t: T) => string[]) {
  const { tags } = usePrefill()
  const filter = ref<string[]>([])
  const filtered = ref<T[] | undefined>(input.value)
  watch(() => [filter.value, input.value], () => {
    const out = !!input.value && tags.value.length > 0
      ? input.value.filter((t: T) => {
        const subjectTags = provider(t)
        return filter.value.every(t => subjectTags.includes(t))
      })
      : input.value
    filtered.value = out
  })
  return { tags, filter, filtered }
}
