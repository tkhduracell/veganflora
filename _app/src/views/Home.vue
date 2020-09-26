<template>
  <b-container class="home">
    <b-button :to="{name: 'new'}" variant="primary" class="mb-2 float-md-right" :disabled="!recipes" small v-if="recipes">
      <span>Nytt Recept</span>
    </b-button>
    <h1>Kokboken</h1>
    <div>
      <h5>Filter</h5>
      <RecipeTags :value="tagFilter" :values="tagValues" v-on:input="tagFilter = $event" />
      <h2 class="mt-2">Recept</h2>
      <RecipeTree :recipes="recipes" v-if="recipes" @remove-item="remove" />
      <div class="text-center" v-else>
        <b-spinner variant="primary" class="mr-2" />
        Hämtar kokboken...
      </div>
    </div>
  </b-container>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api'

import RecipeTree from '@/components/RecipeTree.vue'
import RecipeTags from '@/components/RecipeTags.vue'

import { useRecipes } from '../modules/use/recipes'
import { useTagFilter } from '../modules/use/tag-filter'
import { Recipe } from '../components/types'

const Component = defineComponent({
  components: {
    RecipeTree,
    RecipeTags
  },
  setup () {
    const { tags: tagValues, filter: tagFilter } = useTagFilter()

    const { recipes: _recipes, remove } = useRecipes()

    const recipes = computed(() => {
      const tags = tagFilter.value
      const fitlered = !!_recipes.value && tags.length > 0
        ? _recipes.value.filter((r: Recipe) => {
          return tags.some(t => {
            return (r.tags || []).includes(t)
          })
        })
        : _recipes.value
      return fitlered
    })

    return {
      recipes,
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
