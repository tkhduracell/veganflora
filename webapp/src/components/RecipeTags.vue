<template>
  <div class="recipe-tags">
    <b-form-checkbox-group
      :value="value"
      :options="options"
      @input="$emit('input', $event)"
      name="recipe-tags"
    />
  </div>
</template>

<script lang="ts">
import { PropType, defineComponent, computed } from '@vue/composition-api'

export default defineComponent({
  name: 'RecipieTags',
  props: {
    value: Array as PropType<string[]>,
    values: Array as PropType<string[]>
  },
  setup(props: { values: string[] }) {
    return {
      options: computed(() => {
        return props.values.map(text => {
          return {
            text: text.replace(/[\u2710-\u2726]/gi, ''),
            value: text
          }
        })
      })
    }
  }
})
</script>

<style scoped>
</style>
