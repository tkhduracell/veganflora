<template>
  <div class="pane">
    <RecipeItem
      v-for="item in items"
      :key="'pane-' + item.title"
      :item="item"
      show-title
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue"

import RecipeItem from "@/components/RecipeItem.vue"
import type { Recipe } from "./types"

export default defineComponent({
	naem: "RecipePane",
	props: {
		items: { type: Array as PropType<Recipe[]>, required: true },
	},
	components: {
		RecipeItem,
	},
})
</script>

<style scoped>
.pane {
  display: flex;
  flex-direction: row;
}
.pane div {
  flex: 1;
}
</style>
