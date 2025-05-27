<template>
  <b-container class="home">
    <div class="clearfix">
      <b-button
        v-if="recipes && user"
        :to="{name: 'new'}"
        variant="primary"
        class="mb-2 float-right"
        :disabled="!recipes"
        small
      >
        Nytt Recept
      </b-button>
      <h1 class="float-left">
        Recept
      </h1>
    </div>
    <div>
      <b>Filter</b>
      <RecipeTags
        :value="tagFilter"
        :values="tagValues.map(x => x.text)"
        @input="tagFilter = $event"
      />
      <RecipeTree
        v-if="recipes && recipes.length > 0"
        :recipes="recipes"
        @remove-item="remove"
      />
      <div v-else-if="recipes">
        Inga recept har taggarna:
        <b>{{ tagFilter.join(' & ') }}</b>
      </div>
      <div
        v-else
        class="text-center"
      >
        <b-spinner
          variant="primary"
          class="mr-2"
        />Hämtar kokboken...
      </div>
    </div>
  </b-container>
</template>

<script lang="ts">
import { defineComponent } from "vue"

import RecipeTree from "@/components/RecipeTree.vue"
import RecipeTags from "@/components/RecipeTags.vue"

import { type Recipes, useRecipes } from "../modules/use/recipes"
import { useTagFilter } from "../modules/use/tag-filter"
import type { Recipe } from "../components/types"
import { useAuth } from "@/modules/use/auth"

const Component = defineComponent({
	components: {
		RecipeTree,
		RecipeTags,
	},
	setup() {
		function flatTags(r: Recipe): string[] {
			return (r.tags || []).map((t) => (typeof t === "object" ? t.text : t))
		}

		const { recipes, remove } = useRecipes() as Recipes
		const { tags: tagValues, filter: tagFilter, filtered } = useTagFilter<Recipe>(recipes, flatTags)

		const { user } = useAuth()

		return {
			recipes: filtered,
			tagValues,
			tagFilter,
			remove,
			user,
		}
	},
})

export default Component
</script>

<style scoped>
</style>
