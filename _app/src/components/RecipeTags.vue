<template>
  <div class="recipe-tags">
    <b-form-checkbox-group
      size="lg"
      :value="value"
      :options="values.map(s => ({ text: s, value: s }))"
      @input="$emit('input', $event)"
      name="recipe-tags"
    />
  </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from '@vue/composition-api'

export default defineComponent({
  props: {
    value: Array as PropType<string[]>,
    values: Array as PropType<string[]>
  }
})
</script>

<style scoped>
</style>
