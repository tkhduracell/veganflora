<template>
  <div class="recipe" v-if="item">
    <b v-if="showTitle">{{ item.title }}</b>

    <div class="categories">
      <span class="mt-2" v-for="(c, idx) in item.category" :key="JSON.stringify(c)">
        <span class="separator" v-if="idx > 0">/</span>
        <b-badge variant="primary">{{ c }}</b-badge>
      </span>
    </div>

    <div class="tags">
      <span class="mt-2" v-for="(t, idx) in item.tags" :key="JSON.stringify(t)">
        <span class="separator" v-if="idx > 0">,</span>
        <b-badge :variant="typeof t === 'string' ? 'secondary' : t.color">{{ typeof t === 'string' ? t : t.text }}</b-badge>
      </span>
    </div>

    <div class="size">
      <div>{{ item.size }}</div>
      <div class="m-2">•</div>
      <div class="multiplier">
        <span class="value">{{ multiplier }}x</span>
        <b-button class="button" variant="primary" @click="plus">+</b-button>
        <b-button class="button" variant="primary" @click="minus">﹣</b-button>
      </div>
      <b-checkbox switch v-model="convertEnabled" class="convert">Prefer weight</b-checkbox>
    </div>

    <ul class="ingredients">
      <div
        v-for="(i, idx) in item.ingredients"
        :key="item.key + i.name + i.amount + i.measure + idx"
      >
        <RecipeIngredient :i="convertEnabled ? convert(i) : i" :multiplier="multiplier" />
      </div>
    </ul>
    <p class="breaking">{{ item.text }}</p>
  </div>
  <div v-else>No Item</div>
</template>

<script lang="ts">
import { PropType, defineComponent, ref } from 'vue'

import { useAutoConvert } from '../modules/use/auto-convert'
import { useMulti } from '../modules/use/multi'
import RecipeIngredient from './RecipeIngredient.vue'
import { Recipe } from './types'

export default defineComponent({
  components: { RecipeIngredient },
  props: {
    item: { type: Object as PropType<Recipe>, required: true },
    showTitle: Boolean
  },
  setup(props: { item: Recipe; showTitle: boolean }) {

    const { enabled: convertEnabled, convert } = useAutoConvert()
    const multi = useMulti()

    return { ...multi, convertEnabled, convert }
  }
})
</script>

<style scoped>
h3 {
  margin: 40px 0 0;
}
.categories {
  font-size: 140%;
}
.tags {

}
.breaking {
  white-space: pre-line;
}
.separator {
  display: inline-block;
  width: 1em;
  line-height: 1.2;
  text-align: center;
  vertical-align: bottom;
}
.size {
  display: flex !important;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
}
.convert {
  align-self: center;
  flex-grow: 1;
  text-align: end;
}
.multiplier {
  display: inline-block;
}
.multiplier .button {
  scale: 0.8;
  font-size: 160%;
  width: 1.6em;
  padding: 0;
  margin-left: 0.2em;
  display: inline-block;
}
.multiplier .value {
  width: 2em;
  display: inline-block;
}
</style>
