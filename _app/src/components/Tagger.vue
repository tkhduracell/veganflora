<template>
  <div>
    <span v-for="(c, idx) in value" :key="c">
      <span class="separator" v-if="idx > 0">{{separator}}</span>
      <b-form-tag small :variant="variant" @remove="remove(idx)">{{ c }}</b-form-tag>
    </span>
    <span v-if="value && value.length > 0" class="separator">{{separator}}</span>

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
import { defineComponent, PropType, ref } from '@vue/composition-api'

export default defineComponent({
  name: 'Tagger',
  props: {
    value: { type: Array as PropType<string[]> },
    separator: { type: String, default: ' , ' },
    suggestions: { type: Array as PropType<string[]> },
    variant: { type: String, default: 'primary' }
  },
  setup(props, ctx) {
    const custom = ref<boolean>(false)
    const newTag = ref<string>('')
    const suggestion = ref<string>('')

    function complete() {
      const addition = custom.value ? newTag.value : suggestion.value
      if (!addition || addition.trim().length === 0) return
      const updated = [...(props.value as string[] || []), addition]
      custom.value = false

      ctx.emit('input', updated)
      newTag.value = ''
      suggestion.value = ''
    }

    function remove(idx: number) {
      ctx.emit('input', (props.value as string[] || []).filter((itm, i) => i !== idx))
    }

    return {
      custom, complete, newTag, suggestion, remove
    }
  }
})
</script>

<style>
</style>
