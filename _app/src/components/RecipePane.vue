<template>
  <div class="pane">
    <RecipieItem :item="item" v-for="item in items" :key="'pane-' + item.title" />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from '@vue/composition-api'

import RecipieItem from '@/components/RecipeItem.vue'
import { Recipe } from './types'

export default defineComponent({
  props: {
    items: Array as PropType<Recipe[]>
  },
  components: {
    RecipieItem
  }
})
</script>

<style scoped>
.pane {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}
</style>
