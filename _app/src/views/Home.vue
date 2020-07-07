<template>
  <div class="home">
    <h1>Alla Recept</h1>
    <b-button :to="{name: 'new'}" variant="primary" class="mb-2" size="sm">
      Nytt Recept
    </b-button>
    <div>
      <RecipeTree :recipes="recipes" v-if="recipes" @remove-item="remove"/>
      <b-spinner variant="primary" v-else />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api'

import RecipeTree from '@/components/RecipeTree.vue'

import { useRecipes } from '../modules/use/recipes'

const Component = defineComponent({
  components: {
    RecipeTree
  },
  setup () {
    const { recipes, remove } = useRecipes()

    return {
      recipes,
      remove
    }
  }
})

export default Component
</script>

<style scoped>
</style>
