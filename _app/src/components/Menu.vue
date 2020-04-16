<template>
  <div>
    <div class="week" v-for="(week, weekidx) in weeks" :key="weekidx">
      <div class="day" v-for="(day, dayidx) in week.days" :key="day.name">
        <div class="name">
          {{ day.name }}
        </div>
        <MenuItem @show-items="showItems(weekidx, dayidx, $event)" @remove-item="removeItem(weekidx, dayidx, $event)" :item="{key: 'breakfast', name:'Frukost', items: day.breakfast}" />
        <MenuItem @show-items="showItems(weekidx, dayidx, $event)" @remove-item="removeItem(weekidx, dayidx, $event)" :item="{key: 'lunch', name:'Lunch', items: day.lunch}" />
        <MenuItem @show-items="showItems(weekidx, dayidx, $event)" @remove-item="removeItem(weekidx, dayidx, $event)" :item="{key: 'dinner', name:'Middag', items: day.dinner}" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from '@vue/composition-api'

import MenuItem from '@/components/MenuItem.vue'

type Week = {
  days: Day[];
}

type Day = {
  name: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
}

export default defineComponent({
  props: {
    weeks: Array as PropType<Week[]>
  },
  components: {
    MenuItem
  },
  setup (props, context) {
    function removeItem (week: number, day: number, { type, item }: { type: string; item: string }) {
      context.emit('remove-item', { week, day, type, item })
    }
    function showItems (week: number, day: number, { type }: { type: string }) {
      context.emit('show-items', { week, day, type })
    }

    return {
      removeItem,
      showItems
    }
  }
})
</script>

<style>
.menu {
  display: flex;
  justify-content: center;
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
