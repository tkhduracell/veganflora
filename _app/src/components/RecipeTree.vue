<template>
  <div class="recipe-tree">
    <div class="category" v-for="(recipes, category) in tree" :key="category">
      <strong>{{ category }}</strong>
      <ul>
        <li v-for="r in recipes" :key="category + r.key">
          <div>
            <b-link class="link" :to="{ name: 'show', params: {key: r.key} }">{{r.title}}</b-link>
            <span class="clickable p-0 m-0 ml-1" @click="areyousure(r)">🗑</span>
          </div>
        </li>
      </ul>
    </div>
    <b-modal id="areyousure" centered
      title="Är du säker?"
      button-size="sm"
      ok-variant="danger"
      @ok="$emit('remove-item', deletesubject.key)" v-if="deletesubject">
      <p>Är du säker på att du vill ta bort <strong>{{deletesubject.title}}</strong>?</p>
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
</style>
