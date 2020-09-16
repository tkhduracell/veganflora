<template>
  <div class="recipe">
    <b v-if="showTitle">{{ item.title }}</b>

    <h4>
      <span class="mt-2" v-for="(c, idx) in item.category" :key="c">
        <span class="separator" v-if="idx > 0"> / </span>
        <b-badge variant="primary" >{{ c }}</b-badge>
      </span>
    </h4>

    <h6 class="mt-2" v-for="(t, idx) in item.tags" :key="t">
      <span class="separator" v-if="idx > 0">,</span>
      <b-badge variant="secondary" >{{ t }}</b-badge>
    </h6>

    <p>{{ item.size }}</p>
    <ul class="ingredients">
      <div v-for="(i, idx) in item.ingredients" :key="item.key + i.name + i.amount + i.measure + idx">
        <li v-if="i.measure && i.amount">{{ i.amount }} {{ i.measure }} {{ i.name }}</li>
        <li v-else-if="i.amount">{{ i.amount }} {{ i.name }}</li>
        <li v-else>{{ i.name }}</li>
      </div>
    </ul>
    <p>
      {{ item.text }}
    </p>
  </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from '@vue/composition-api'
import { Recipe } from './types'

export default defineComponent({
  props: {
    item: Object as PropType<Recipe>,
    showTitle: Boolean
  }
})
</script>

<style scoped>
h3 {
  margin: 40px 0 0;
}
</style>
