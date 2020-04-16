<template>
  <div>
    <ul>
      <li v-for="r in recipes" :key="r" @click="selected = r" :class="{'selected': r === selected}" >
        <span class="name">{{r}}</span>
        <div class="selects" v-if="r === selected">
          <div class="select">
            <label>Veckodag</label>
            <select v-model="day">
              <option value="0">Måndag</option>
              <option value="1">Tisdag</option>
              <option value="2">Onsdag</option>
              <option value="3">Torsdag</option>
              <option value="4">Fredag</option>
              <option value="5">Lördag</option>
              <option value="6">Söndag</option>
            </select>
          </div>

          <div class="select">
            <label>Måltid</label>
            <select v-model="type">
              <option value="breakfast">Frukost</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Middag</option>
            </select>
          </div>
          <button @click="add(r)">Lägg till</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from '@vue/composition-api'

export default defineComponent({
  props: {
    recipes: Array as PropType<string[]>
  },
  setup (props, context) {
    const selected = ref<string>()
    const day = ref<number>(0)
    const type = ref<string>('lunch')

    function add (r: string) {
      context.emit('add-item', { item: r, day: day.value, type: type.value })
      selected.value = ''
    }

    return { selected, day, type, add }
  }
})
</script>

<style>
  .selected .name {
    font-weight: bold;
  }
  .selects {
    margin: 10px;
  }
  .select label {
    margin-right: 4px;
  }
</style>
