<template>
  <div class="recipe">
    <b v-if="showTitle">{{ item.title }}</b>
    <p>{{ item.size }}</p>
    <ul class="ingredients">
      <div v-for="(i, idx) in item.ingredients" :key="item.key + i.name + i.amount + i.measure + idx">
        <li v-if="i.measure && i.amount">{{ i.amount }} {{ i.measure }} {{ i.name }}</li>
        <li v-else-if="i.amount">{{ i.amount }} {{ i.name }}</li>
        <li v-else>{{ i.name }}</li>
      </div>
    </ul>
    <p>
      {{ item.text }}
    </p>

  </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from '@vue/composition-api'
import { Recipe } from './types'

export default defineComponent({
  props: {
    item: Object as PropType<Recipe>,
    showTitle: Boolean
  }
})
</script>

<style scoped>
h3 {
  margin: 40px 0 0;
}
</style>
