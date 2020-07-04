<template>
  <div>
      <div v-for="key in Object.keys(items).sort()" :key="key">
        <strong>{{ titleCase(key) }}</strong>
        <ul class="mb-0">
          <li v-for="(item, idx) in items[key]" :key="key + idx">
            <router-link :to="{ name: 'edit', params: { key: item.source.key }}" v-slot="{ href }">
              <span v-b-tooltip.hover.topright.html="tooltip(item, href)">
                  {{ item.amount || '1' }} {{ item.measure || 'styck' }}
              </span>
            </router-link>
          </li>
        </ul>
      </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from '@vue/composition-api'
import { Recipe, Meal, IngredientWithContext, Context, WeekDay, Menu, Day } from './types'

export default defineComponent({
  props: {
    recipes: Array as PropType<Recipe[]>,
    menu: Object as PropType<Menu>,
    findRecipe: Function as PropType<(r: string) => Recipe>
  },
  setup (props: { recipes: Recipe[]; menu: Menu; findRecipe: (r: string) => Recipe }) {
    function flatmap<T, K> (arr: T[], fn: (t: T, idx: number) => K[]): K[] {
      return arr.reduce((acc: K[], x, idx) => acc.concat(fn(x, idx)), [])
    }

    function toIngredientWithContext (key: string, week: number, weekday: WeekDay, meal: Meal): IngredientWithContext[] {
      const source = props.findRecipe(key)

      return source.ingredients.map(i => ({ week, weekday, meal, source, ...i }))
    }

    const itemsRaw = computed<IngredientWithContext[]>(() => {
      const weeks = Object.values(props.menu)
      return flatmap(weeks, (week, wi) => {
        const days = Object.entries(week.days)
        return flatmap(days, ([weekday, day]: [string, Day]) => {
          return [
            ...flatmap((day[Meal.breakfast] || []), r => toIngredientWithContext(r, wi, weekday as WeekDay, Meal.breakfast)),
            ...flatmap((day[Meal.lunch] || []), r => toIngredientWithContext(r, wi, weekday as WeekDay, Meal.lunch)),
            ...flatmap((day[Meal.dinner] || []), r => toIngredientWithContext(r, wi, weekday as WeekDay, Meal.dinner))
          ]
        })
      })
    })

    const items = computed(() => {
      return itemsRaw.value.reduce((acc: { [key: string]: ({measure?: string; amount?: string} & Context<Recipe>)[] }, x) => {
        const { name, measure, amount, week, weekday, meal, source } = x

        acc[name] = [...(acc[name] || []), { measure, amount, week, weekday, meal, source: { ...source, ingredients: [], text: '' } }]
        return acc
      }, {})
    })

    function tooltip (item: {measure?: string; amount?: string} & Context<Recipe>, editUrl: string) {
      const r = props.recipes.find(r => r.key === item.source.key)
      return `${r ? r.title : '...'}<br>${item.weekday}, ${item.meal}<br><a href="${editUrl}">Redigera</a>`
    }

    function titleCase (str: string): string {
      return str.toLowerCase().split(' ').map(function (word) {
        return word.replace(word[0], word[0].toUpperCase())
      }).join(' ')
    }

    return { items, itemsRaw, tooltip, titleCase }
  }
})
</script>
