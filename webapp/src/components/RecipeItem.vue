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
      >
        <span
          v-if="idx > 0"
          class="separator"
        >,</span>
        <b-badge :variant="typeof t === 'string' ? 'secondary' : t.color">{{ typeof t === 'string' ? t : t.text
        }}</b-badge>
      </span>
    </div>

    <div class="image my-2" v-if="item.image && typeof item.image === 'string'">
      <img
        :src="item.image"
        :alt="item.title"
        class="img-fluid"
      />
    </div>

    <div class="size">
      <div>{{ item.size }}</div>
      <div>✕</div>
      <div class="multiplier">{{ multiplier }}</div>
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
        －
      </b-button>
      
      <b-checkbox
        v-model="convertEnabled"
        switch
        class="convert"
      >
        Prefer weight
      </b-checkbox>
    </div>

    <b>Ingredienser</b>
    <ul class="ingredients">
      <div
        v-for="(i, idx) in item.ingredients"
        :key="item.key + i.name + i.amount + i.measure + idx"
      >
        <b
          v-if="i.name.match(/^\*.*\*$/gi)"
          class="d-block"
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
    
    <b>Gör så här</b>
    <div class="breaking" v-html="itemRendered" />
  </div>
  <div v-else>
    No Item
  </div>
</template>

<script lang="ts">
import { type PropType, computed, defineComponent, ref } from "vue"

import { useAutoConvert } from "../modules/use/auto-convert"
import { useMulti } from "../modules/use/multi"
import RecipeIngredient from "./RecipeIngredient.vue"
import type { Recipe } from "./types"
import markdownit from "markdown-it"
import { normalize } from "@/modules/ingredients"

const md = markdownit("commonmark")

export default defineComponent({
	components: { RecipeIngredient },
	props: {
		item: { type: Object as PropType<Recipe>, required: true },
		showTitle: Boolean,
	},
	setup(props) {
		const { enabled: convertEnabled, convert } = useAutoConvert()
		const multi = useMulti()
		const itemRendered = computed(() => md.render(props.item.text))

		return { ...multi, convertEnabled, convert, itemRendered, normalize }
	},
})
</script>

<style scoped>
.recipe {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5em;
}

.image img {
  max-height: 300px;
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
  justify-content: center;
  gap: 0.5em;
}

.size .button {
  width: 1.5em;
  height: 1.5em;
  padding: 0;
  font-size: 1.5em;
}

.size .multiplier {
  width: 1.2em;
}

.convert {
  align-self: center;
  flex-grow: 1;
  text-align: end;
}

.multiplier {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
}

.multiplier .button {
  scale: 0.8;
  font-size: 160%;
  width: 1.6em;
  padding: 0;
  margin-left: 0.2em;
  display: inline-block;
}

</style>
