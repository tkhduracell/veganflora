<template>
  <b-container class="edit">
    <h1 v-if="key && recipe && recipe.title">{{recipe.title}}</h1>
    <b-spinner v-if="key && (!recipe || !recipe.title)" class="mb-2" />
    <h1 v-if="!key && recipe && recipe.title">{{recipe.title}}</h1>
    <h1 v-if="!key && (!recipe || !recipe.title)">Nytt Recept</h1>

    <b-form @submit.prevent="save" v-if="recipe">
      <b-form-group id="input-group-1" label="Namn" label-for="input-1">
        <b-form-input
          id="input-1"
          v-model.trim="recipe.title"
          type="text"
          required
          :disabled="saving"
          @keyup="onChange"
        />
      </b-form-group>

      <b-form-group id="input-group-21" label="Kategori" label-for="input-21">
        <Tagger
          id="input-21"
          variant="primary"
          separator=" / "
          :category="recipe.category"
          @update:category="recipe.category = $event"
          :suggestions="categories"
          :disabled="saving"
          @keyup="onChange"
        />
      </b-form-group>

      <b-form-group id="input-group-5" label="Taggar" label-for="input-5">
        <Tagger
          id="input-5"
          variant="secondary"
          :tags="recipe.tags"
          @update:tags="recipe.tags = $event"
          :suggestions="tags"
          :disabled="saving"
          @keyup="onChange"
        />
      </b-form-group>

      <b-form-group id="input-group-3" label="Storlek" label-for="input-3">
        <b-form-input
          id="input-3"
          v-model.trim="recipe.size"
          type="text"
          required
          :disabled="saving"
          @keyup="onChange"
        />
      </b-form-group>

      <b-form-group id="input-group-4" label="Text" label-for="input-4">
        <b-form-textarea
          id="input-4"
          v-model.trim="recipe.text"
          required
          :disabled="saving"
          rows="20"
          @keyup="onChange"
        />
      </b-form-group>

      <b-modal id="modal-paste-list" title="Klista in lista" @ok="onPasteList">
        <b-form-group class>
          Klista in ingredienslista
          <b-textarea v-model.trim="pasteList" rows="20"></b-textarea>
        </b-form-group>
      </b-modal>

      <b-form-group id="input-group-5" class="position-relative">
        <template #label>
          Ingredienser (Namn, Mängd, Enhet)
          <b-link v-b-modal.modal-paste-list class="ml-2">
            <b-icon-clipboard />
          </b-link>
        </template>

        <b-input-group size="sm" v-for="(i, idx) in recipe.ingredients" :key="'ingredient-' + idx">
          <b-form-input
            v-model="i.name"
            :id="'input-5-'+ idx + '-name' "
            type="text"
            required
            :disabled="saving"
            @keyup="onChange"
          />
          <b-form-input
            v-model="i.amount"
            :id="'input-5-'+ idx + '-amount' "
            type="text"
            placeholder="1"
            :disabled="saving"
            @keyup="onChange"
          />
          <b-form-input
            v-model="i.measure"
            :id="'input-5-'+ idx + '-measure' "
            type="text"
            placeholder="styck"
            :disabled="saving"
            @keyup="onChange"
          />
          <b-button size="sm" variant="link" @click="removeIngredientRow(idx)">🗑</b-button>
        </b-input-group>
        <b-alert
          variant="warning"
          v-if="!recipe.ingredients || recipe.ingredients.length === 0"
          show
        >
          <div>Inga ingredienser tillagda. Använd knappen nedan för att lägga till.</div>
          <b-button
            class="add"
            size="sm"
            variant="success"
            @click="addIngredientRow()"
            :disabled="saving"
          >➕Lägg till</b-button>
        </b-alert>
        <b-button
          class="add"
          size="sm"
          variant="success"
          @click="addIngredientRow()"
          :disabled="saving"
          v-if="recipe.ingredients && recipe.ingredients.length > 0"
        >➕Lägg till</b-button>
      </b-form-group>

      <div class="loader d-flex" v-if="saving">
        <b-spinner variant="primary" class="mr-2" />
        <span class="mt-1">Sparar till databas</span>
      </div>

      <div class="buttons" v-else>
        <b-button type="submit" size="lg" variant="primary" :disabled="isEmpty">Spara</b-button>
        <b-button variant="link" @click="$router.go(-1)">Tillbaka</b-button>
      </div>
    </b-form>

    <div class="loader d-flex" v-else>
      <b-spinner variant="primary" class="mr-2" />
      <span class="mt-1">Laddar...</span>
    </div>

    <div v-if="savedStateAtPretty">
      <small>Sparat lokalt {{ savedStateAtPretty }}</small>
    </div>
  </b-container>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue'
import debounce from 'lodash.debounce'

import { BIconClipboard } from 'bootstrap-vue'

import Tagger from '../components/Tagger.vue'

import { AutoTag, AutoTags } from '../modules/tags'
import { Suggest } from '../modules/suggestions'
import { useRecipe } from '../modules/use/recipes'
import { usePrefill } from '../modules/use/prefill'
import { parseIngredient } from '../modules/ingredients'
import { Recipe, Ingredient } from '../components/types'
import { useRoute, useRouter } from 'vue-router/composables'

export default defineComponent({
  components: { Tagger, BIconClipboard },
  setup() {
    const { params } = useRoute()
    const router = useRouter()
    const key = params.key || false

    const saving = ref(false)
    const { recipe, onSave } = useRecipe(key || '')
    const prefill = usePrefill()

    const tags = computed(() => {
      return Suggest.tags(
        prefill.tags.value.map(x => x.text),
        (recipe.value.tags || []).map(t => typeof t === 'object' ? t.text : t)
      ).filter(s => !AutoTags.includes(s as AutoTag))
    })
    const categories = computed(() => {
      return Suggest.categories(prefill.categories.value, recipe.value.category)
    })

    onMounted(() => {
      if (!key) {
        const state = localStorage.getItem('saveState')
        recipe.value = state ? JSON.parse(state) as Recipe : {} as Recipe
      }
    })

    const savedStateAt = ref<Date>()
    const savedStateAtPretty = computed(() => {
      return savedStateAt.value
        ? savedStateAt.value.toISOString()
          .replace(/T/i, ' ')
          .replace(/\.\d{3}Z/i, '')
        : ''
    })

    const onChange = debounce(function () {
      if (!key) {
        localStorage.setItem('saveState', JSON.stringify(recipe.value))
        savedStateAt.value = new Date()
      }
    }, 1000)

    function removeIngredientRow(index: number) {
      const { ingredients, ...rest } = recipe.value
      recipe.value = {
        ...rest,
        ingredients: ingredients.filter((itm, idx) => idx !== index)
      }
    }

    function addIngredientRow() {
      const { ingredients, ...rest } = recipe.value
      recipe.value = {
        ...rest,
        ingredients: [
          ...ingredients, { name: '' } as Ingredient
        ]
      }
    }

    const isEmpty = computed(() => {
      const r = recipe.value || {} as Recipe
      return !r || (r.ingredients || []).length === 0 || (r.title || '').trim().length === 0
    })

    async function save() {
      try {
        saving.value = true
        const { savekey } =  await onSave()
        localStorage.removeItem('saveState')
        router.push({ name: 'show', params: { key: savekey } })
      } catch (err) {
        console.error('Failed to save data')
      } finally {
        saving.value = false
      }
    }

    const pasteList = ref('')
    function onPasteList() {
      const ingredientsAdd = pasteList.value
        .split(/\n/gi)
        .map(parseIngredient)
      const { ingredients, ...rest } = recipe.value
      recipe.value = {
        ...rest,
        ingredients: ingredients ? [...ingredients, ...ingredientsAdd] : [...ingredientsAdd]
      }
      onChange()
      pasteList.value = ''
    }

    return {
      key,
      recipe,
      removeIngredientRow,
      addIngredientRow,
      save,
      saving,
      isEmpty,
      savedStateAtPretty,
      onChange,
      pasteList,
      onPasteList,
      tags,
      categories
    }
  }
})
</script>

<style scoped>
.separator {
  margin-left: 2px;
  margin-right: 2px;
  padding: 0.25em 0.4em;
  font-size: 75%;
  font-weight: 700;
  line-height: 1;
}
.btn.add {
  margin-top: 10px;
}
.btn.right-top {
  position: absolute;
  right: 0;
  top: -2em;
}
</style>
