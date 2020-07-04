<template>
  <div>
    <div class="week" v-for="(week, weekname) in menu" :key="'w-' + weekname">
      <div class="day" v-for="(day, weekday) in week.days" :key="'w-' + weekname + '-d-' + weekday">
        <div class="name">
          {{ weekday }}
        </div>
        <MenuItem :week="weekname" :weekday="weekday" meal="Frukost" :items=decorate(day.Frukost) @remove-item="removeItem(weekname, weekday, 'Frukost', $event)" />
        <MenuItem :week="weekname" :weekday="weekday" meal="Lunch" :items=decorate(day.Lunch) @remove-item="removeItem(weekname, weekday, 'Lunch', $event)" />
        <MenuItem :week="weekname" :weekday="weekday" meal="Middag" :items=decorate(day.Middag) @remove-item="removeItem(weekname, weekday, 'Middag', $event)" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from '@vue/composition-api'

import MenuItem from '@/components/MenuItem.vue'
import { Menu, WeekDay, Meal, Recipe } from './types'
import { useRecipes } from '../modules/use/recipes'

export default defineComponent({
  props: {
    menu: Object as PropType<Menu>
  },
  components: {
    MenuItem
  },
  setup (props, context) {
    const { findRecipe } = useRecipes()
    function removeItem (week: string, weekday: WeekDay, meal: Meal, item: string) {
      context.emit('remove-item', { week, weekday, meal, item })
    }

    function decorate (res: string[]): Recipe[] {
      return res.map(findRecipe)
    }

    return {
      removeItem,
      decorate
    }
  }
})
</script>

<style>
.menu {
  display: flex;
  flex-direction: column;
}
.day {
  display: flex;
  justify-content: center;
  align-items: stretch;
  align-content: stretch;

}
.day div {
  flex-basis: calc(33% - 34px);

  flex-grow: 0;
  flex-shrink: 0;
}
.day .name {
  flex-basis: 100px;
  flex-grow: 0;
  flex-shrink: 0;
  align-self: center;
  font-size: 150%;
}
</style>
