<template>
  <div class="recipe">
    <a :name=item.title>
      <b>{{ item.title }}</b>
    </a>
    <p>{{ item.size }}</p>
    <ul v-for="i in item.ingredients" :key="i">
      <li>{{ i }}</li>
    </ul>
    <p>
      {{ item.text }}
    </p>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { PropType, defineComponent } from '@vue/composition-api'
import { Recipe } from './types'

export default defineComponent({
  props: {
    item: Object as PropType<Recipe>
  }
})
</script>

<style scoped>
h3 {
  margin: 40px 0 0;
}
</style>
