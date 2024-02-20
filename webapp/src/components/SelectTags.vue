<template>
  <div>
    <span
      v-for="(c, idx) in uniqBy(tags, t => t.text)"
      :key="JSON.stringify(c)"
    >
      <span
        v-if="idx > 0"
        class="separator"
      >{{ separator }}</span>
      <b-form-tag
        small
        :variant="c.color || 'secondary'"
        class="div"
        @remove="remove(idx)"
      >{{ c.text }}</b-form-tag>
    </span>
    <span
      v-if="tags && tags.length > 0"
      class="separator"
    >{{ separator }}</span>

    <input
      v-if="custom"
      v-model="newTag"
      class="ml-1"
      @blur="complete()"
      @keypress.enter="complete()"
    >
    <select
      v-else-if="suggestions.length > 0"
      v-model="suggestion"
      size="sm"
      @change="complete()"
    >
      <option value>
        Välj...
      </option>
      <option
        v-for="s in uniqBy(suggestions, x => x.text).map(x => x.text)"
        :key="s"
        :value="s"
      >
        {{ s }}
      </option>
    </select>
    <b-link
      class="ml-1 p-1"
      @click="custom = !custom"
    >
      {{ custom ? '⨯' : '✎' }}
    </b-link>
  </div>
</template>

<script lang="ts">
import { BFormTag, BLink } from 'bootstrap-vue'
import { remove, uniqBy } from 'lodash'
import { defineComponent, PropType, ref } from 'vue'
import { Tag } from './types'

export default defineComponent({
  name: 'SelectTags',
  props: {
    tags: { type: Array as PropType<Tag[]> },
    separator: { type: String, default: ' , ' },
    suggestions: { required: true, type: Array as PropType<Tag[]> }
  },
  setup (props, { emit }) {
    const custom = ref<boolean>(false)
    const newTag = ref<string>('')
    const suggestion = ref<string>('')

    function complete () {
      const addition = custom.value ? newTag.value : suggestion.value
      if (!addition || addition.trim().length === 0) return
      custom.value = false

      const newValue: Tag[] = [...(props.tags ?? []), { text: addition, color: '' }]
      emit('update:tags', newValue)

      newTag.value = ''
      suggestion.value = ''
    }

    function remove (idx: number) {
      const newValue: Tag[] = props.tags?.filter((itm, i) => i !== idx) ?? []
      emit('update:tags', newValue)
    }

    return {
      custom, complete, newTag, suggestion, remove, uniqBy
    }
  }
})
</script>

<style></style>
