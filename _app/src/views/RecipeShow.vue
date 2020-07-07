<template>
  <div class="show">
    <h1>{{ isLoaded ? recipe.title : 'Laddar...'  }}</h1>
    <b-link v-if="isLoaded" :to="{ name: 'edit', params: {key}}">
      Redigera
    </b-link>
    <RecipeItem :item="recipe" v-if="isLoaded" />
    <b-spinner variant="primary" v-else />
  </div>
</template>

<script lang="ts">
import { defineComponent, SetupContext, computed } from '@vue/composition-api'

import { useRecipe } from '../modules/use/recipes'

import RecipeItem from '@/components/RecipeItem.vue'

export default defineComponent({
  components: {
    RecipeItem
  },
  setup (props, context: SetupContext) {
    const key = context.root.$router.currentRoute.params.key
    const { recipe } = useRecipe(key)
    const isLoaded = computed(() => recipe.value && recipe.value.title)

    return {
      key,
      recipe,
      isLoaded
    }
  }
})
</script>

<style scoped>
  .separator {
    margin-left: 2px;
    margin-right: 2px;
    padding: 0.25em 0.4em;
    font-size: 75%;
    font-weight: 700;
    line-height: 1;
  }
  .btn.add {
    margin-top: 10px;
  }
</style>
