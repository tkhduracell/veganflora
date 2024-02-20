<template>
  <div
    v-if="item"
    class="recipe"
  >
    <b v-if="showTitle">{{ item.title }}</b>

    <div class="categories">
      <span
        v-for="(c, idx) in item.category"
        :key="JSON.stringify(c)"
        class="mt-2"
      >
        <span
          v-if="idx > 0"
          class="separator"
        >/</span>
        <b-badge variant="primary">{{ c }}</b-badge>
      </span>
    </div>

    <div class="tags">
      <span
        v-for="(t, idx) in item.tags"
        :key="JSON.stringify(t)"
        class="mt-2"
      >
        <span
          v-if="idx > 0"
          class="separator"
        >,</span>
        <b-badge :variant="typeof t === 'string' ? 'secondary' : t.color">{{ typeof t === 'string' ? t : t.text
        }}</b-badge>
      </span>
    </div>

    <div class="size">
      <div>{{ item.size }}</div>
      <div class="m-2">
        •
      </div>
      <div class="multiplier">
        <span class="value">{{ multiplier }}x</span>
        <b-button
          class="button"
          variant="primary"
          @click="plus"
        >
          +
        </b-button>
        <b-button
          class="button"
          variant="primary"
          @click="minus"
        >
          ﹣
        </b-button>
      </div>
      <b-checkbox
        v-model="convertEnabled"
        switch
        class="convert d-block d-sm-none"
      >
        Prefer weight
      </b-checkbox>
      <b-checkbox
        v-model="convertEnabled"
        switch
        class="convert d-none d-sm-block mt-5"
      >
        Prefer weight
      </b-checkbox>
    </div>

    <ul class="ingredients">
      <div
        v-for="(i, idx) in item.ingredients"
        :key="item.key + i.name + i.amount + i.measure + idx"
      >
        <b
          v-if="i.name.match(/^\*.*\*$/gi)"
          class="d-block mt-2"
        >
          {{ i.name.replace(/^\*(.*)\*$/gi, '$1') }}
        </b>
        <RecipeIngredient
          v-else
          :i="convertEnabled ? convert(i) : i"
          :multiplier="multiplier"
        />
      </div>
    </ul>
    <p class="breaking">
      {{ item.text }}
    </p>
  </div>
  <div v-else>
    No Item
  </div>
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
  setup (props: { item: Recipe; showTitle: boolean }) {
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
