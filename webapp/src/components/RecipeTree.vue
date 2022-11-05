<template>
  <b-row class="recipe-tree">
    <b-col md=4 xl=3 class="category mt-4" v-for="(recipes, category) in tree" :key="category">
      <strong>{{ category }}</strong>
      <div v-for="r in recipes" :key="category + r.key" class="recipe clearfix ml-2 mt-1 mb-1">
        <b-link class="link" :to="{ name: 'show', params: {key: r.key} }">{{ r.title }}</b-link>

        <div class="d-none d-md-block"></div>
        <b-badge
          v-for="(t, ti) in r.tags"
          :key="r.key + '-tag-' + ti"
          class="ml-2 ml-md-0  mr-1 ml-md-0"
          :style="[ typeof t === 'object' ? {'background-color': t.color} : '']"
        >{{ typeof t === 'object' ? t.text : t}}</b-badge>
      </div>
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { PropType, defineComponent, ref, computed, getCurrentInstance } from 'vue'

import RecipeItem from '@/components/RecipeItem.vue'

import { Recipe, Tag } from './types'
import { unique } from '../modules/common/set'

export default defineComponent({
  name: 'RecipieTree',
  props: {
    recipes: { required: true, type: Array as PropType<Recipe[]> }
  },
  components: {
    RecipeItem
  },
  setup(props) {
    const tree = computed(() => {
      const tree = {} as Record<string, { key: string; title: string; tags: Tag[] }[]>
      unique(props.recipes.map(r => r.category)).forEach(c => {
        tree[c.join(' / ')] = props.recipes
          .filter(r => {
            return r.category.join('') === c.join('')
          })
          .map(({ title, key, tags }) => ({ key, title, tags: tags as Tag[] }))
      })
      return tree
    })
    return {
      tree,
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
.recipe:hover {
  text-decoration: underline;
}
</style>
