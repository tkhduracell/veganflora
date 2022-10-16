<template>
  <div class="pane">
    <RecipeItem :item="item" v-for="item in items" :key="'pane-' + item.title" show-title />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from '@vue/composition-api'

import RecipeItem from '@/components/RecipeItem.vue'
import { Recipe } from './types'

export default defineComponent({
  naem: 'RecipePane',
  props: {
    items: { type: Array as PropType<Recipe[]>, required: true }
  },
  components: {
    RecipeItem
  }
})
</script>

<style scoped>
.pane {
  display: flex;
  flex-direction: row;
}
.pane div {
  flex: 1;
}
</style>
