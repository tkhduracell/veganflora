<template>
  <div class="recipes">
    <ul v-for="l in recipes" :key="l.title">
        <li class="recipe">
          <RecipeItem :item="l" />
        </li>
    </ul>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { PropType, defineComponent } from '@vue/composition-api'

import RecipeItem from '@/components/RecipeItem.vue'

import { Recipe } from './types'

export default defineComponent({
  props: {
    recipes: Array as PropType<Recipe[]>
  },
  components: {
    RecipeItem
  }
})
</script>

<style scoped>
h3 {
  margin: 40px 0 0;
}
</style>
