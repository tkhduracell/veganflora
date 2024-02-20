<template>
  <div>
    <span
      v-for="(c, idx) in category"
      :key="JSON.stringify(c)"
      class=""
    >
      <span
        v-if="idx > 0"
        class="separator"
      >{{ separator }}</span>
      <b-form-tag
        small
        :variant="variant"
        class="div"
        @remove="remove(idx)"
      >{{ c }}</b-form-tag>
    </span>
    <span
      v-if="category && category.length > 0"
      class="separator"
    >{{ separator }}</span>

    <input
      v-if="custom"
      v-model="newValue"
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
        v-for="s in suggestions"
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
import { remove } from 'lodash'
import { defineComponent, PropType, ref } from 'vue'
import { Category, Tag } from './types'

export default defineComponent({
  name: 'SelectCategory',
  props: {
    category: { type: Array as PropType<string[]> },
    separator: { type: String, default: ' , ' },
    suggestions: { required: true, type: Array as PropType<string[]> },
    variant: { type: String, default: 'primary' }
  },
  setup (props, { emit }) {
    const custom = ref<boolean>(false)
    const newValue = ref<string>('')
    const suggestion = ref<string>('')

    function complete () {
      const addition = custom.value ? newValue.value : suggestion.value
      if (!addition || addition.trim().length === 0) return
      custom.value = false

      const out: Category[] = [...(props.category ?? []), addition]
      emit('update:category', out)

      newValue.value = ''
      suggestion.value = ''
    }

    function remove (idx: number) {
      const newValue = props.category?.filter((itm, i) => i !== idx) ?? []
      emit('update:category', newValue)
    }

    return {
      custom, complete, newValue, suggestion, remove
    }
  }
})
</script>

<style>
</style>
