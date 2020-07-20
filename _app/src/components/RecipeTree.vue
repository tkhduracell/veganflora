<template>
  <div class="recipe-tree">
    <div class="category" v-for="(recipes, category) in tree" :key="category">
      <strong>{{ category }}</strong>

        <div v-for="r in recipes" :key="category + r.key" class="recipe clearfix ml-2 mt-1 mb-1">
          <b-link class="link" :to="{ name: 'show', params: {key: r.key} }">
            {{ r.title.replace(/ - ej testat/gi, '') }}
          </b-link>
          <b-badge v-if="r.title.match(/ - ej testat/gi)"> Ej testad </b-badge>
          <span class="clickable p-0 m-0 ml-1 float-right" @click="areyousure(r)">🗑</span>
        </div>

    </div>
    <b-modal id="areyousure" centered
      title="Är du säker?"
      button-size="sm"
      ok-variant="danger"
      @ok="$emit('remove-item', deletesubject.key)">
      <p v-if="deletesubject">Är du säker på att du vill ta bort <strong>{{deletesubject.title}}</strong>?</p>
    </b-modal>
  </div>
</template>

<script lang="ts">
import { PropType, defineComponent, ref } from '@vue/composition-api'

import RecipeItem from '@/components/RecipeItem.vue'

import { Recipe } from './types'

export default defineComponent({
  props: {
    recipes: Array as PropType<Recipe[]>
  },
  components: {
    RecipeItem
  },
  setup ({ recipes }: {recipes: Recipe[]}, context) {
    const categories = recipes.map(r => r.category)

    const tree = {} as { [key: string]: {key: string; title: string}[] }
    categories.forEach(c => {
      tree[c.join(' / ')] = recipes.filter(r => r.category.join('') === c.join(''))
        .map(({ title, key }) => ({ key, title }))
    })

    const deletesubject = ref<{key: string; title: string}>(undefined)

    async function areyousure (r: {key: string; title: string}) {
      deletesubject.value = r
      context.root.$bvModal.show('areyousure')
    }

    return {
      tree,
      areyousure,
      deletesubject
    }
  }
})
</script>

<style scoped>
h3 {
  margin: 40px 0 0;
}
.link {
  font-weight: bold;
}
.clickable:hover {
  cursor: pointer;
}
.recipe:hover {
  text-decoration: underline;
}
</style>
