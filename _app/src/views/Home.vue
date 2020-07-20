<template>
  <div class="home">
    <h1>Alla Recept</h1>
    <b-button :to="{name: 'new'}" variant="primary" class="mb-2" :disabled="!recipes" small>
      <b-spinner small v-if="!recipes" class="mr-1 mb-1" />
      <span v-if="!recipes">Laddar...</span>
      <span v-else>Nytt Recept</span>
    </b-button>
    <div>
      <RecipeTree :recipes="recipes" v-if="recipes" @remove-item="remove"/>
      <div class="text-center" v-else>
        <b-spinner variant="primary" />
      </div>
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
