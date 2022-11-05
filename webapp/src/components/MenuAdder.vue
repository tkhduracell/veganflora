<template>
  <div>
    <b-form inline class="mb-2">
      <b-input id="form-search" v-model="searchterm" placeholder="Filtrera..." size=sm />
    </b-form>
    <h5>Resultat</h5>
    <div v-if="result">
      <div v-for="r in result" :key="r.key" @click="selected = r.key" :class="{'selected': r.key === selected}" >
        <span class="name">{{r.title}}</span>
        <div class="selects" v-if="r.key === selected">
          <b-form @submit.prevent="add(r.key)" inline>
            <b-form-select size=sm v-model="weekday" :options="weekdays" />
            <b-form-select size=sm v-model="meal" :options="meals" class="ml-1" />
            <b-button type="submit" variant="primary" size=sm class="ml-1">
              Lägg till ➡️
            </b-button>
          </b-form>
        </div>
      </div>
    </div>
    <div v-else>
      <b-spinner />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, computed } from 'vue'
import { Meal, Meals, WeekDay, WeekDays, Recipe } from './types'

export default defineComponent({
  props: {
    recipes: Array as PropType<Recipe[]>
  },
  setup (props, context) {
    const selected = ref<string>('Ölmjöl')
    const weekday = ref<WeekDay>(WeekDay.tuesday)
    const meal = ref<Meal>(Meal.lunch)

    function add (item: string) {
      context.emit('add-item', { item, weekday: weekday.value, meal: meal.value })
      selected.value = ''
    }

    const searchterm = ref<string>('')
    const result = computed(() => {
      return props.recipes ? (props.recipes as Recipe[])
        .filter(r => {
          return !searchterm.value ||
            r.key.toLocaleLowerCase().includes(searchterm.value.toLocaleLowerCase()) ||
            r.title.toLocaleLowerCase().includes(searchterm.value.toLocaleLowerCase())
        })
        .slice(-20)
        : null
    })

    return {
      selected,
      add,
      result,
      searchterm,
      weekday,
      weekdays: WeekDays,
      meal,
      meals: Meals
    }
  }
})
</script>

<style>
  .selected .name {
    font-weight: bold;
  }
  .selects {
    margin: 10px 0;
  }
  .select label {
    margin-right: 4px;
  }
</style>
