<template>
  <div class="recipe-tree">
    <div class="category" v-for="(recipes, category) in tree" :key="category">
      <strong>{{ category }}</strong>
      <div v-for="r in recipes" :key="category + r.key" class="recipe clearfix ml-2 mt-1 mb-1">
        <b-link class="link" :to="{ name: 'show', params: {key: r.key} }">{{ r.title }}</b-link>

        <b-badge
          v-for="(t, ti) in r.tags"
          :key="r.key + '-tag-' + ti"
          class="ml-2"
          :style="[ typeof t === 'object' ? {'background-color': t.color} : '']"
        >{{ typeof t === 'object' ? t.text : t}}</b-badge>
        <span class="clickable p-0 m-0 ml-1 float-right" @click="areyousure(r)">🗑</span>
      </div>
    </div>
    <b-modal
      id="areyousure"
      centered
      title="Är du säker?"
      button-size="sm"
      ok-variant="danger"
      @ok="$emit('remove-item', deletesubject.key)"
    >
      <p v-if="deletesubject">
        Är du säker på att du vill ta bort
        <strong>{{deletesubject.title}}</strong>?
      </p>
    </b-modal>
  </div>
</template>

<script lang="ts">
import { PropType, defineComponent, ref, computed } from '@vue/composition-api'

import RecipeItem from '@/components/RecipeItem.vue'

import { Recipe, Tags } from './types'
import { firestore } from 'firebase'

function uniq<T>(t: T[]) {
  return new Set([...t])
}

function autoTag(r: Recipe): Recipe {
  function lastNDays(ts: firestore.Timestamp, n: number) {
    return new Date().getTime() - ts.toDate().getTime() < 1000 * 3600 * n
  }
  const created = r.created_at && lastNDays(r.created_at, 14)
    ? { text: '✦ Nytt', color: '#FF650D' }
    : null
  const updated = r.updated_at && lastNDays(r.updated_at, 14)
    ? { text: '✐ Uppdaterad', color: '#B39812' }
    : null
  return {
    ...r,
    tags: [...(r.tags || []), created, updated].filter(t => t !== null) as Tags
  }
}

export default defineComponent({
  name: 'RecipieTree',
  props: {
    recipes: Array as PropType<Recipe[]>
  },
  components: {
    RecipeItem
  },
  setup(props: { recipes: Recipe[] }, context) {
    const tree = computed(() => {
      const tree = {} as Record<string, { key: string; title: string; tags: Tags }[]>
      uniq(props.recipes.map(r => r.category)).forEach(c => {
        tree[c.join(' / ')] = props.recipes.filter(r => r.category.join('') === c.join(''))
          .map(autoTag)
          .map(({ title, key, tags }) => ({ key, title, tags: tags as Tags }))
      })
      return tree
    })

    const deletesubject = ref<{ key: string; title: string }>(undefined)

    async function areyousure(r: { key: string; title: string }) {
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
