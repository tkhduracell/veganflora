<template>
  <div class="home">
    <h1>Meny {{ week }} / {{ weekday }} / {{ meal }}</h1>
    <div v-if="items && items.length === 0">
      Inga recept inlagda!
      Lägg in recept i <router-link class="strong" :to="{ name: 'menu' }">menyn</router-link> först!
    </div>
    <RecipePane v-else-if="items" :items="items"></RecipePane>
    <div class="loader" v-else>
      <b-spinner class="mr-2" variant="primary"></b-spinner>
      <span class="mb-1">Laddar...</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, SetupContext } from '@vue/composition-api'

import RecipePane from '@/components/RecipePane.vue'

import { useRecipes } from '../modules/use/recipes'
import { useMenu } from '../modules/use/menu'
import { WeekDay, Meal, Recipe } from '../components/types'

const Component = defineComponent({
  components: {
    RecipePane
  },
  setup (props, context: SetupContext) {
    const params = context.root.$router.currentRoute.params
    const week = params.week
    const weekday = params.weekday as WeekDay
    const meal = params.meal as Meal

    const { menu } = useMenu()
    const { recipes, findRecipe } = useRecipes()

    const items = computed<Recipe[] | undefined>(() => {
      const items = menu.value && menu.value[week]
        ? menu.value[week].days[weekday][meal] || []
        : []
      return items.map(i => findRecipe(i))
    })

    return {
      week,
      weekday,
      meal,
      recipes,
      menu,
      items
    }
  }
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
