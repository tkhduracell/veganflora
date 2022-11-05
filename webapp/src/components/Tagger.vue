<template>
  <div>
    <span v-for="(c, idx) in tags || category" :key="JSON.stringify(c)" class="">
      <span class="separator" v-if="idx > 0">{{separator}}</span>
      <b-form-tag small :variant="variant" @remove="remove(idx)" class="div">{{ typeof c === 'string' ? c : c.text }}</b-form-tag>
    </span>
    <span v-if="category && category.length > 0 || tags && tags.length > 0" class="separator">{{separator}}</span>

    <input
      v-if="custom"
      v-model="newTag"
      class="ml-1"
      @blur="complete()"
      @keypress.enter="complete()"
    />
    <select v-else-if="suggestions.length > 0" size="sm" v-model="suggestion" @change="complete()">
      <option value>Välj...</option>
      <option v-for="s in suggestions" :value="s" :key="s">{{ s }}</option>
    </select>
    <b-link @click="custom = !custom" class="ml-1 p-1">{{ custom ? '⨯' : '✎' }}</b-link>
  </div>
</template>

<script lang="ts">
import { BFormTag, BLink } from 'bootstrap-vue'
import { remove } from 'lodash'
import { defineComponent, PropType, ref } from 'vue'
import { Category, Tag } from './types'

export default defineComponent({
  name: 'Tagger',
  props: {
    category: { type: Array as PropType<string[]> },
    tags: { type: Array as PropType<Tag[]> },
    separator: { type: String, default: ' , ' },
    suggestions: { required: true, type: Array as PropType<string[]> },
    variant: { type: String, default: 'primary' }
  },
  setup(props, { emit }) {
    const custom = ref<boolean>(false)
    const newTag = ref<string>('')
    const suggestion = ref<string>('')

    if (props.category && props.tags) throw Error('Can not use both tags and category')

    function complete() {
      const addition = custom.value ? newTag.value : suggestion.value
      if (!addition || addition.trim().length === 0) return
      custom.value = false

      if (props.category) {
        const newValue: Category[] = [...(props.category ?? []), addition]
        emit('update:category', newValue)
      }
      if (props.tags) {
        const newValue: Tag[] = [...(props.tags ?? []), { text: addition, color: '' }]
        emit('update:tags', newValue)
      }
      newTag.value = ''
      suggestion.value = ''
    }

    function remove(idx: number) {
      if (props.category) {
        const newValue = props.category?.filter((itm, i) => i !== idx) ?? []
        emit('update:category', newValue)
      }
      if (props.tags) {
        const newValue: Tag[] = props.tags?.filter((itm, i) => i !== idx) ?? []
        emit('update:tags', newValue)
      }

    }

    return {
      custom, complete, newTag, suggestion, remove
    }
  }
})
</script>

<style>
</style>
