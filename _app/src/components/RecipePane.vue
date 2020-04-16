<template>
  <div class="pane">
    <RecipieItem :item="item" v-for="item in items" :key="'pane-' + item.title" />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from '@vue/composition-api'

import RecipieItem from '@/components/RecipeItem.vue'
import { Recipe } from './types'

export default defineComponent({
  props: {
    recipes: Array as PropType<Recipe[]>,
    displayed: Array as PropType<string[]>
  },
  components: {
    RecipieItem
  },
  setup (props: { recipes: Recipe[]; displayed: string[] }) {
    const items = computed(() => {
      return props.displayed.map(title => {
        return props.recipes.find(x => {
          console.log(title, x.title)
          return x.title === title
        })
      })
    })

    return { items }
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
