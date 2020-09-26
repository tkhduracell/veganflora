<template>
  <b-container class="home">
    <b-button
      :to="{name: 'new'}"
      variant="primary"
      class="mb-2 float-md-right"
      :disabled="!recipes"
      small
      v-if="recipes"
    >
      <span>Nytt Recept</span>
    </b-button>
    <h1>Kokboken</h1>
    <div>
      <b>Filter</b>
      <RecipeTags :value="tagFilter" :values="tagValues" v-on:input="tagFilter = $event" />
      <h2 class="mt-2">Recept</h2>
      <RecipeTree :recipes="recipes" v-if="recipes && recipes.length > 0" @remove-item="remove" />
      <div v-else-if="recipes">
        Inga recept har taggarna:
        <b>{{ tagFilter.join(' & ') }}</b>
      </div>
      <div class="text-center" v-else>
        <b-spinner variant="primary" class="mr-2" />Hämtar kokboken...
      </div>
    </div>
  </b-container>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api'

import RecipeTree from '@/components/RecipeTree.vue'
import RecipeTags from '@/components/RecipeTags.vue'

import { Recipes, useRecipes } from '../modules/use/recipes'
import { useTagFilter } from '../modules/use/tag-filter'
import { Recipe } from '../components/types'

const Component = defineComponent({
  components: {
    RecipeTree,
    RecipeTags
  },
  setup() {
    const { recipes, remove } = useRecipes() as Recipes
    const {
      tags: tagValues,
      filter: tagFilter,
      filtered
    } = useTagFilter<Recipe>(recipes, r => r.tags || [])

    return {
      recipes: filtered,
      tagValues,
      tagFilter,
      remove
    }
  }
})

export default Component
</script>

<style scoped>
</style>
