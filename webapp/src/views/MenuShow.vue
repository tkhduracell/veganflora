<template>
  <b-container class="home">
    <h1>Meny {{ week }} / {{ weekday }} / {{ meal }}</h1>
    <div v-if="items && items.length === 0">
      Inga recept inlagda!
      Lägg in recept i
      <router-link
        class="strong"
        :to="{ name: 'menu' }"
      >
        menyn
      </router-link>först!
    </div>
    <RecipePane
      v-else-if="items"
      :items="items"
    />
    <div
      v-else
      class="loader"
    >
      <b-spinner
        class="mr-2"
        variant="primary"
      />
      <span class="mb-1">Laddar...</span>
    </div>
  </b-container>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue"

import RecipePane from "@/components/RecipePane.vue"

import { useRecipes } from "../modules/use/recipes"
import { useMenu } from "../modules/use/menu"
import type { WeekDay, Meal, Recipe } from "../components/types"
import { useRoute } from "vue-router/composables"

const Component = defineComponent({
	components: {
		RecipePane,
	},
	setup() {
		const { params } = useRoute()
		const week = params.week
		const weekday = params.weekday as WeekDay
		const meal = params.meal as Meal

		const { menu } = useMenu()
		const { recipes, findRecipe } = useRecipes()

		const items = computed<Recipe[]>(() => {
			const items = menu?.value[week] ? menu.value[week].days[weekday][meal] || [] : []
			return items.map((i) => findRecipe(i)).filter((r) => r) as Recipe[]
		})

		return {
			week,
			weekday,
			meal,
			recipes,
			menu,
			items,
		}
	},
})

export default Component
</script>

<style scoped>
.splitpane {
  display: flex;
  flex-direction: row;
}
.splitpane .list {
  flex-basis: 340px;
}
.splitpane .menu {
  flex-basis: calc(100% - 340px - 10px);
}
.strong {
  font-weight: bold;
}
</style>
