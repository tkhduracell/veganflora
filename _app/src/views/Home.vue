<template>
  <div class="home">
    <h1 v-if="displayed">Recept</h1>
    <RecipePane v-if="displayed" :displayed="displayed" :recipes="recipes"></RecipePane>
    <h1>Meny</h1>
    <div class="splitpane">
      <RecipeSelect class="list" :recipes="recipes.map(r => r.title)"
        @add-item="addMenuItem" />
      <Menu class="menu" :weeks="weeks"
        @show-items="showItems"
        @remove-item="removeMenuItem" />
    </div>
    <h1>Handlalista</h1>
    <Groceries :recipes="recipes" :weeks="weeks" />
    <h1>Alla Recept</h1>
    <RecipeList :recipes="recipes" />
  </div>
</template>

<script lang="ts">
import { recipes } from '../../../data.json'
import { defineComponent, ref, onMounted } from '@vue/composition-api'

import RecipeList from '@/components/RecipeList.vue'
import RecipeSelect from '@/components/RecipeSelect.vue'
import RecipePane from '@/components/RecipePane.vue'
import Menu from '@/components/Menu.vue'
import Groceries from '@/components/Groceries.vue'
import { Week } from '../components/types'

const template = [
  {
    days: [
      { name: 'Måndag' },
      { name: 'Tisdag' },
      { name: 'Onsdag' },
      { name: 'Torsdag' },
      { name: 'Fredag' },
      { name: 'Lördag' },
      { name: 'Söndag' }
    ]
  }
] as Week[]

const Component = defineComponent({
  components: {
    RecipeList,
    RecipeSelect,
    RecipePane,
    Menu,
    Groceries
  },
  setup () {
    const weeks = ref<Week[]>([])

    onMounted(() => {
      const saved = localStorage.getItem('menu')

      if (saved) {
        weeks.value = JSON.parse(saved)
      } else {
        localStorage.setItem('menu', JSON.stringify(template))
        weeks.value = template
      }
    })

    function addMenuItem ({ item, day, type }: {item: string; day: number; type: string}) {
      const week = 0

      const clone = JSON.parse(JSON.stringify(weeks.value))

      clone[week].days[day][type] = (clone[week].days[day][type] || []).concat(item)

      weeks.value = clone

      localStorage.setItem('menu', JSON.stringify(clone))
    }

    function removeMenuItem ({ week, day, type, item }: {week: number; item: string; day: number; type: string}) {
      const clone = JSON.parse(JSON.stringify(weeks.value))

      clone[week].days[day][type] =
        (clone[week].days[day][type] || []).filter((i: string) => i !== item)

      weeks.value = clone

      localStorage.setItem('menu', JSON.stringify(clone))
    }

    const displayed = ref<string[]>([])
    function showItems ({ week, day, type }: {week: number; day: number; type: string}) {
      displayed.value = weeks.value[week].days[day][type]
    }

    return {
      removeMenuItem,
      addMenuItem,
      showItems,
      recipes,
      weeks,
      displayed
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
