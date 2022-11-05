<template>
  <div>
    <span v-for="(c, idx) in tags" :key="JSON.stringify(c)">
      <span class="separator" v-if="idx > 0">{{separator}}</span>
      <b-form-tag small :variant="c.color || 'secondary'" @remove="remove(idx)" class="div">{{ c.text }}</b-form-tag>
    </span>
    <span v-if="tags && tags.length > 0" class="separator">{{separator}}</span>

    <input
      v-if="custom"
      v-model="newTag"
      class="ml-1"
      @blur="complete()"
      @keypress.enter="complete()"
    />
    <select v-else-if="suggestions.length > 0" size="sm" v-model="suggestion" @change="complete()">
      <option value>Välj...</option>
      <option v-for="s in suggestions.map(x => x.text)" :value="s" :key="s">{{ s }}</option>
    </select>
    <b-link @click="custom = !custom" class="ml-1 p-1">{{ custom ? '⨯' : '✎' }}</b-link>
  </div>
</template>

<script lang="ts">
import { BFormTag, BLink } from 'bootstrap-vue'
import { remove } from 'lodash'
import { defineComponent, PropType, ref } from 'vue'
import { Tag } from './types'

export default defineComponent({
  name: 'SelectTags',
  props: {
    tags: { type: Array as PropType<Tag[]> },
    separator: { type: String, default: ' , ' },
    suggestions: { required: true, type: Array as PropType<Tag[]> }
  },
  setup(props, { emit }) {
    const custom = ref<boolean>(false)
    const newTag = ref<string>('')
    const suggestion = ref<string>('')

    function complete() {
      const addition = custom.value ? newTag.value : suggestion.value
      if (!addition || addition.trim().length === 0) return
      custom.value = false

      const newValue: Tag[] = [...(props.tags ?? []), { text: addition, color: '' }]
      emit('update:tags', newValue)

      newTag.value = ''
      suggestion.value = ''
    }

    function remove(idx: number) {
      const newValue: Tag[] = props.tags?.filter((itm, i) => i !== idx) ?? []
      emit('update:tags', newValue)
    }

    return {
      custom, complete, newTag, suggestion, remove
    }
  }
})
</script>

<style>
</style>
