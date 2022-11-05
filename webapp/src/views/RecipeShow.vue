<template>
  <b-container class="show">
    <h1>{{ isLoaded ? recipe.title : 'Laddar...'  }}</h1>
    <div v-if="isLoaded">
      <span v-b-modal.areyousure >
        🗑
      </span>
      |
      <b-link :to="{ name: 'edit', params: {key}}">
        Redigera
      </b-link>
      <RecipeItem :item="recipe" />
    </div>
    <b-spinner variant="primary" v-else />

    <b-modal id="areyousure" centered title="Är du säker?" ok-variant="danger" button-size="sm" @ok="remove" v-if="recipe">
      <p class="">
        Är du säker på att du vill ta bort <strong>{{recipe.title}}</strong>?
      </p>
    </b-modal>
  </b-container>
</template>

<script lang="ts">
import { defineComponent, SetupContext, computed } from 'vue'

import { useRecipe } from '../modules/use/recipes'

import RecipeItem from '@/components/RecipeItem.vue'
import { useRoute } from 'vue-router/composables'

export default defineComponent({
  name: 'RecipeShow',
  components: {
    RecipeItem
  },
  setup () {
    const { params } = useRoute()
    const key = params.key
    const { recipe, remove } = useRecipe(key)
    const isLoaded = computed(() => !!(recipe.value && recipe.value.title))

    return {
      key,
      recipe,
      remove,
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
