<template>
  <b-container class="groceries">
    <h1>Handlalista</h1>
    <p>Enligt in lagda recept behöver följande hadlas:</p>
    <Groceries
      v-if="menu"
      :recipes="recipes"
      :menu="menu"
      :find-recipe="findRecipe"
      :can-edit="!!user"
    />
    <div v-else>
      Inga varor, eftersom
      <router-link :to="{ name: 'menu' }">
        menyn
      </router-link>är tom.
    </div>
  </b-container>
</template>

<script lang="ts">
import { defineComponent } from "vue"

import Groceries from "@/components/Groceries.vue"

import { useRecipes } from "../modules/use/recipes"
import { useMenu } from "../modules/use/menu"
import { useAuth } from "@/modules/use/auth"

const Component = defineComponent({
	components: {
		Groceries,
	},
	setup() {
		const { user } = useAuth()
		const { menu } = useMenu()
		const { recipes, findRecipe } = useRecipes()

		return {
			recipes,
			findRecipe,
			menu,
			user,
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
</style>
