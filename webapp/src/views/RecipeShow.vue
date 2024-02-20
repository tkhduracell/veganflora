<template>
  <b-container class="show">
    <div class="header">
      <h1>{{ isLoaded ? recipe.title : 'Laddar...' }}</h1>
      <div
        v-if="isLoaded && user"
        class="delete"
      >
        <span v-b-modal.areyousure>🗑</span>
      </div>
    </div>
    <div
      v-if="isLoaded"
      class="position-relative"
    >
      <b-button
        v-if="user"
        variant="primary"
        :to="{ name: 'edit', params: {key}}"
        class="edit"
      >
        <b-icon-pencil
          scale="0.8"
          style="margin-bottom: 2px;"
        />
        Redigera
      </b-button>
      <RecipeItem
        :item="recipe"
        class="mt-2"
      />
    </div>
    <b-spinner
      v-else
      variant="primary"
    />

    <b-modal
      v-if="recipe"
      id="areyousure"
      centered
      title="Är du säker?"
      ok-variant="danger"
      button-size="sm"
      @ok="remove"
    >
      <p class="">
        Är du säker på att du vill ta bort <strong>{{ recipe.title }}</strong>?
      </p>
    </b-modal>
  </b-container>
</template>

<script lang="ts">
import { defineComponent, SetupContext, computed } from 'vue'

import { useRecipe } from '../modules/use/recipes'

import RecipeItem from '@/components/RecipeItem.vue'
import { useRoute, useRouter } from 'vue-router/composables'
import { useAuth } from '@/modules/use/auth'

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
    const router = useRouter()
    const { user } = useAuth()
    return {
      key,
      recipe,
      user,
      remove: () => remove().then(x => router.push('/')),
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
  .btn.edit {
    position: absolute;
    right: 0;
    margin-top: -6px;
  }
  .show .header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between
  }
  .show .header h1 {
    margin: 0;
  }
  .show .header .delete {
    margin: 0 16px;
    scale: 1.4;
  }
</style>
