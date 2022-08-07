<template>
  <div class="recipe">
    <b v-if="showTitle">{{ item.title }}</b>

    <h4>
      <span class="mt-2" v-for="(c, idx) in item.category" :key="c">
        <span class="separator" v-if="idx > 0">/</span>
        <b-badge variant="primary">{{ c }}</b-badge>
      </span>
    </h4>

    <div v-if="item.tags">
      <h6 class="mt-2" v-for="(t, idx) in item.tags" :key="t">
        <span class="separator" v-if="idx > 0">,</span>
        <b-badge variant="secondary">{{ t }}</b-badge>
      </h6>
    </div>

    <div>
      {{ item.size }}
      •
      <div class="multiplier">
        <span class="value">{{ multiplier }}x</span>
        <b-button class="button" variant="secondary" size="sm" @click="plus">+</b-button>
        <b-button class="button" variant="secondary" size="sm" @click="minus">-</b-button>
      </div>
    </div>

    <ul class="ingredients">
      <div
        v-for="(i, idx) in item.ingredients"
        :key="item.key + i.name + i.amount + i.measure + idx"
      >
        <li
          v-if="i.measure && i.amount"
        >{{ prettyMulti(i.amount, multiplier) }} {{ i.measure }} {{ i.name }}</li>
        <li v-else-if="i.amount">{{ prettyMulti(i.amount, multiplier) }} {{ i.name }}</li>
        <li v-else>{{ i.name }}</li>
      </div>
    </ul>
    <p class="breaking">{{ item.text }}</p>
  </div>
</template>

<script lang="ts">
import { PropType, defineComponent, ref } from '@vue/composition-api'
import { Recipe } from './types'

export default defineComponent({
  props: {
    item: Object as PropType<Recipe>,
    showTitle: Boolean
  },
  setup(props: { item: Recipe; showTitle: boolean }) {
    type Multi = 1 | 2 | 3 | 4 | 0.5
    const multiplier = ref<Multi>(1)
    function plus() {
      if (multiplier.value >= 1) {
        multiplier.value = Math.min(4, Math.floor(multiplier.value + 1)) as Multi
      }
      if (multiplier.value === 0.5) {
        multiplier.value = 1
      }
    }
    function minus() {
      if (multiplier.value > 1) {
        multiplier.value = Math.floor(multiplier.value - 1) as Multi
      }
      if (multiplier.value === 1) {
        multiplier.value = 0.5
      }
    }
    function prettyMulti(amount: any, multiplier: Multi) {
      const out = amount * multiplier
      if (isNaN(out)) {
        return `${multiplier} x ${amount}`
      }
      return out
    }

    return { multiplier, plus, minus, prettyMulti }
  }
})
</script>

<style scoped>
h3 {
  margin: 40px 0 0;
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
.multiplier {
  display: inline-block;
}
.multiplier .button {
  scale: 0.6;
  width: 2.6em;
  margin-left: 0.2em;
  display: inline-block;
}
.multiplier .value {
  width: 2em;
  display: inline-block;
}
</style>
