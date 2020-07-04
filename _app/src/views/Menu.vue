<template>
  <div class="home">
    <h1>Skapa veckans meny</h1>
    <p>Här skapar du veckans meny.</p>
    <div class="splitpane">
      <div class="list">
        <MenuAdder class="list" :recipes="recipes"
          @add-item="add" />
      </div>
      <div class="menu">
        <b-form-select v-model="week" :options="weeks" />
        <Menu :menu="menu"
          @remove-item="remove" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from '@vue/composition-api'

import MenuAdder from '@/components/MenuAdder.vue'
import Menu from '@/components/Menu.vue'

import { useRecipes } from '../modules/use/recipes'
import { useMenu } from '../modules/use/menu'
import { Recipe, WeekDay, Meal } from '../components/types'

const Component = defineComponent({
  components: {
    MenuAdder,
    Menu
  },
  setup () {
    const { recipes } = useRecipes()
    const { menu, removeMenuItem, addMenuItem } = useMenu()

    const week = ref<string>('')

    watch(menu, newer => {
      if (!week.value && newer && Object.keys(newer).length > 0) {
        const [first] = Object.keys(newer)
        week.value = first
      }
    })

    const weeks = computed(() => Object.keys(menu.value))

    function add ({ item, weekday, meal }: {item: string; weekday: WeekDay; meal: Meal}) {
      const recipe = recipes.value.find(r => r.key === item)
      if (recipe) addMenuItem(week.value, recipe.key, weekday, meal)
    }

    function remove ({ item, weekday, meal }: {item: string; weekday: WeekDay; meal: Meal}) {
      const recipe = recipes.value.find(r => r.key === item)
      if (recipe) removeMenuItem(week.value, recipe.key, weekday, meal)
    }

    return {
      add,
      remove,
      recipes,
      menu,
      week,
      weeks
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
