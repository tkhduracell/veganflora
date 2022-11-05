<template>
  <div>
    <div class="week" v-for="[weekname, week] in Object.entries(menu)" :key="'w-' + weekname">
      <div class="day" v-for="weekday in WeekDays" :key="'w-' + weekname + '-d-' + weekday">
        <div class="name">
          {{ weekday }}
        </div>
        <MenuItem :week="weekname" :weekday="weekday" meal="Frukost"
          :items=decorate(week.days[weekday].Frukost)
          @remove-item="removeItem(weekname, weekday, Meal.breakfast, $event)" />
        <MenuItem :week="weekname" :weekday="weekday" meal="Lunch"
          :items=decorate(week.days[weekday].Lunch)
          @remove-item="removeItem(weekname, weekday, Meal.lunch, $event)" />
        <MenuItem :week="weekname" :weekday="weekday" meal="Middag"
          :items=decorate(week.days[weekday].Middag)
          @remove-item="removeItem(weekname, weekday, Meal.dinner, $event)" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'

import MenuItem from '@/components/MenuItem.vue'
import { Menu, WeekDay, Meal, Recipe, WeekDays } from './types'
import { useRecipes } from '../modules/use/recipes'

export default defineComponent({
  props: {
    menu: { type: Object as PropType<Menu>, required: true }
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
      return res.map(findRecipe).filter(r => r) as Recipe[]
    }

    return {
      removeItem,
      decorate,
      WeekDays,
      Meal
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
