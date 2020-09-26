<template>
  <div class="recipe-tags">
    <b-form-checkbox-group
      size="sm"
      :value="value"
      :options="values.map(s => ({ text: s, value: s }))"
      @input="$emit('input', $event)"
      name="recipe-tags"
      buttons />

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
