<template>
  <div>
    <ul>
      <li v-for="key in Object.keys(items).sort()" :key="key">
        <div v-if="items[key].length > 1">
          {{ key }}
          <ul>
            <li>
              {{ items[key].map(itm => `${itm.amount || '1 styck'} ${itm.measure || ''}`).join(' + ') }}
            </li>
          </ul>
        </div>
        <div v-else>
          {{ key }}
        </div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from '@vue/composition-api'
import { Recipe, Week, Ingredient } from './types'
import { parseIngredient } from '../modules/ingredients'

export default defineComponent({
  props: {
    recipes: Array as PropType<Recipe[]>,
    weeks: Array as PropType<Week[]>
  },
  setup (props: { recipes: Recipe[]; weeks: Week[] }) {
    function flatmap<T, K> (arr: T[], fn: (t: T) => K[]): K[] {
      return arr.reduce((acc: K[], x) => acc.concat(fn(x)), [])
    }

    const findRecipie = (x: string) => props.recipes.find(r => r.title === x) || { ingredients: [] }

    const itemsRaw = computed<Ingredient[]>(() => {
      return flatmap(props.weeks, week => {
        return flatmap(week.days, day => {
          return [
            ...flatmap((day.breakfast || []).map(findRecipie), r => r.ingredients),
            ...flatmap((day.lunch || []).map(findRecipie), r => r.ingredients),
            ...flatmap((day.dinner || []).map(findRecipie), r => r.ingredients)
          ]
        })
      }).map(parseIngredient)
    })

    const items = computed(() => {
      return itemsRaw.value.reduce((acc: { [key: string]: {measure?: string; amount?: string}[] }, x) => {
        const { name } = x

        const data = { measure: x.measure, amount: x.amount }
        acc[name] = [...(acc[name] || []), data]
        return acc
      }, {})
    })

    return { items, itemsRaw }
  }
})
</script>
