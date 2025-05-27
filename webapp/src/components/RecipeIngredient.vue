<template>
  <div>
    <li
      v-if="i.measure && i.amount"
    >
      {{ prettyMulti(i.amount, multiplier) }} {{ i.measure }} {{ i.name }}
    </li>
    <li v-else-if="i.amount">
      {{ prettyMulti(i.amount, multiplier) }} {{ i.name }}
    </li>
    <li v-else>
      {{ i.name }}
    </li>
  </div>
</template>

<script lang="ts">
import { useMulti, type Multi } from "@/modules/use/multi"
import { type PropType, defineComponent, ref } from "vue"

import type { Ingredient } from "./types"

export default defineComponent({
	props: {
		i: { type: Object as PropType<Ingredient>, required: true },
		multiplier: { type: Number as PropType<Multi>, required: true },
	},
	setup() {
		const { prettyMulti } = useMulti()

		return { prettyMulti }
	},
})
</script>

<style scoped>
</style>
