<template>
  <div :class="[item.key, 'item']">
    <b>{{ item.name }}</b>
    <span class="action" @click="$emit('show-items', {type: item.key})">📤</span>
    <ul v-if="item.items && item.items.length > 0">
      <li v-for="l in item.items" :key="l">
        {{ l }}
        <span class="action" @click="$emit('remove-item', { type: item.key, item: l })">🗑</span>
      </li>
    </ul>
    <p v-else><i>Tomt</i></p>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from '@vue/composition-api'

type Item = {
  name: string;
  key: string;
  items: string[];
}

export default defineComponent({
  props: {
    item: Object as PropType<Item>
  }
})
</script>

<style>
  .item {
    border: 0.5px solid grey;
    border-radius: 5px;
    margin: 4px;
    padding: 4px;
  }
  .action {
    float: right;
    cursor: pointer;
    user-select: none;
  }
  .action:active {
    opacity: 0.7;
  }

</style>
