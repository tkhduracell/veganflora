<template>
  <b-container class="home">
    <div class="clearfix">
      <b-button
        :to="{name: 'new'}"
        variant="primary"
        class="mb-2 float-right"
        :disabled="!recipes"
        small
        v-if="recipes"
      >Nytt Recept</b-button>
      <h1 class="float-left">Recept</h1>
    </div>
    <div>
      <b>Filter</b>
      <RecipeTags :value="tagFilter" :values="tagValues" v-on:input="tagFilter = $event" />
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
    function flatTags(r: Recipe): string[] {
      return (r.tags || []).map(t => typeof t === 'object' ? t.text : t)
    }

    const { recipes, remove } = useRecipes() as Recipes
    const {
      tags: tagValues,
      filter: tagFilter,
      filtered
    } = useTagFilter<Recipe>(recipes, flatTags)

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
