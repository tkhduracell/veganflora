<template>
  <div class="edit">
    <h1 v-if="key && recipe && recipe.title">{{recipe.title}}</h1>
    <b-spinner v-if="key && (!recipe || !recipe.title)" class="mb-2" />
    <h1 v-if="!key && recipe && recipe.title">{{recipe.title}}</h1>
    <h1 v-if="!key && (!recipe || !recipe.title)">Nytt Recept</h1>

    <b-form @submit.prevent="save" v-if="recipe">
      <b-form-group id="input-group-1" label="Namn" label-for="input-1">
        <b-form-input  id="input-1" v-model.trim="recipe.title" type="text" required :disabled=saving />
      </b-form-group>

      <b-form-group id="input-group-2" label="Category" label-for="input-2">
        <b-form-input  id="input-2" :value="(recipe.category || []).join(' / ')" @change="setCategory($event)" type="text" required :disabled=saving />

        <span v-for="(c, idx) in recipe.category" :key="c">
          <span class="separator" v-if="idx > 0">/</span>
          <b-badge variant="primary" >{{ c }}</b-badge>
        </span>
      </b-form-group>

      <b-form-group id="input-group-3" label="Storlek" label-for="input-3">
        <b-form-input  id="input-3" v-model.trim="recipe.size" type="text" required :disabled=saving />
      </b-form-group>

      <b-form-group id="input-group-4" label="Text" label-for="input-4">
        <b-form-textarea  id="input-4" v-model.trim="recipe.text" required :disabled=saving rows=20 />
      </b-form-group>

      <b-form-group id="input-group-5" label="Ingridienser (Namn, Mängd, Enhet)" >
        <b-input-group  v-for="(i, idx) in recipe.ingredients" :key="'ingredient-' + idx">
          <b-form-input v-model="i.name" :id="'input-5-'+ idx + '-name' " type="text" required :disabled=saving />
          <b-form-input v-model="i.amount" :id="'input-5-'+ idx + '-amount' " type="text" placeholder="1" :disabled=saving />
          <b-form-input v-model="i.measure" :id="'input-5-'+ idx + '-measure' " type="text" placeholder="styck" :disabled=saving />
          <b-button size="sm" variant="link" @click="removeIngredientRow(idx)"> 🗑</b-button>
        </b-input-group>
        <b-alert variant="warning" v-if="!recipe.ingredients || recipe.ingredients.lenght === 0" show>
          <div>Inga ingredienser tillagda. Använd knappen nedan för att lägga till.</div>
          <b-button class="add" size=sm variant="success" @click="addIngredientRow()" :disabled=saving> ➕Lägg till</b-button>
        </b-alert>
        <b-button class="add" size=sm variant="success" @click="addIngredientRow()" :disabled=saving
          v-if="recipe.ingredients && recipe.ingredients.lenght > 0"> ➕Lägg till</b-button>
      </b-form-group>

      <div class="loader d-flex" v-if="saving">
        <b-spinner variant="primary" class="mr-2"/>
        <span class="mt-1">Sparar till databas</span>
      </div>

      <div class="buttons" v-else>
        <b-button type="submit" size="lg" variant="primary" :disabled="isEmpty">Spara</b-button>
        <b-button variant="link" @click="$router.go(-1)">Tillbaka</b-button>
      </div>

    </b-form>

    <div class="loader d-flex" v-else>
      <b-spinner variant="primary" class="mr-2"/>
      <span class="mt-1">Laddar...</span>
    </div>

    <div v-if="isDebug" class="mt-4">
      <hr>
      <strong>JSON representation</strong>
      <pre>{{ JSON.stringify(recipe, null, 2) }}</pre>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, SetupContext, computed, watch } from '@vue/composition-api'

import { useRecipe } from '../modules/use/recipes'
import { Recipe, Ingredient } from '../components/types'

export default defineComponent({
  setup (props, context: SetupContext) {
    const key = context.root.$router.currentRoute.params.key || false
    const isDebug = process.env.NODE_ENV !== 'production'

    const saving = ref(false)
    const { recipe, onSave } = useRecipe(key || '')

    if (!key) {
      watch(recipe, (ne, old) => {
        console.log(old, ne)
      })
    }

    function removeIngredientRow (index: number) {
      if (!recipe) return
      const r: Recipe = {
        ...recipe.value,
        ingredients: [
          ...recipe.value.ingredients.filter((itm, idx) => idx !== index)
        ]
      }
      recipe.value = r
    }

    function addIngredientRow () {
      if (!recipe) return
      const r: Recipe = {
        ...recipe.value,
        ingredients: [
          ...(recipe.value.ingredients || []), { name: '' } as Ingredient
        ]
      }
      recipe.value = r
    }

    function setCategory (text: string) {
      if (!recipe) return
      recipe.value = { ...recipe.value, category: text.split('/').map(s => s.trim()) }
    }

    const isEmpty = computed(() => {
      const r = recipe.value || {}
      return !r || (r.ingredients || []).length === 0 || r.title.trim().length === 0
    })

    async function save () {
      try {
        saving.value = true
        await onSave()
        if (context.parent) context.parent.$router.push('/')
      } catch (err) {
        console.error('Failed to save data')
      } finally {
        saving.value = false
      }
    }

    return {
      key,
      recipe,
      removeIngredientRow,
      addIngredientRow,
      setCategory,
      save,
      saving,
      isEmpty,
      isDebug
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
</style>
