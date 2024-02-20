<template>
  <div :class="[meal, 'item']">
    <b>{{ meal }}</b>
    <router-link
      v-if="items && items.length"
      class="action"
      :to="{ name: 'menu-show', params: { week, weekday, meal } }"
    >
      🔍
    </router-link>
    <div v-if="items && items.length > 0">
      <div
        v-for="(l, idx) in items"
        :key="week + weekday + meal + l.key + idx"
      >
        <b-link :to="{ name: 'show', params: {key: l.key}}">
          {{ l.title }}
        </b-link>
        <b-button
          variant="link"
          size="sm"
          class="action p-0 m-0 ml-1"
          @click="$emit('remove-item', l.key)"
        >
          🗑
        </b-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Recipe } from './types'

export default defineComponent({
  props: {
    items: { required: true, type: Array as PropType<Recipe[]> },
    meal: { required: true, type: String },
    week: { required: true, type: String },
    weekday: { required: true, type: String }
  }
})
</script>

<style scoped>
  .item {
    border: 0.5px solid grey;
    border-radius: 5px;
    margin: 4px;
    padding: 4px;
  }
  .action {
    float: right;
  }
  .action:hover {
    text-decoration: none !important;
  }
  .action:active {
    opacity: 0.7;
  }

</style>
