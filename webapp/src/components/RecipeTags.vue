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
import { PropType, defineComponent, computed } from 'vue'

export default defineComponent({
  name: 'RecipeTags',
  props: {
    value: { type: Array as PropType<string[]>, required: true },
    values: { type: Array as PropType<string[]>, required: true },
  },
  setup(props) {
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
