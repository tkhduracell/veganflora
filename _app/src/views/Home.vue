<template>
  <div class="home">
    <h1>Alla Recept</h1>
    <b-button :to="{name: 'new'}" variant="primary" class="mb-2">Nytt Recept</b-button>
    <RecipeList :recipes="recipes" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api'

import RecipeList from '@/components/RecipeList.vue'

import { useRecipes } from '../modules/use/recipes'

const Component = defineComponent({
  components: {
    RecipeList
  },
  setup () {
    const { recipes } = useRecipes()

    return {
      recipes
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
</style>
