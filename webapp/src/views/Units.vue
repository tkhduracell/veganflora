<template>
  <b-container class="converts">
    <h1>Måttenheter</h1>
    <b-row class="clearfix" v-if="data">
      <b-col cols=12 v-for="[key, item] in sortBy(Object.entries(data), ([k,]) => k)">
        <b-row no-gutters class="mb-2 mt-2">
          <b-col cols="10">
            <b-form-input size="lg" :value="item.name" @input="update(key, 'name', $event)" :state="isValidPattern(item.name)" />
          </b-col>
          <b-col cols="auto" class="item icon trash" @click="remove(key)">
            <b-icon-trash-fill scale="1.4" class=""/>
          </b-col>
        </b-row>
        <div v-for="([subkey, line], idx) in sortBy(Object.entries(item.lines), ([k,]) => k)">
          <b-row no-gutters class="">
            <b-col cols=auto class="line icon plus show" @click="addLine(key)" v-if="idx === Object.keys(item.lines).length - 1">
              <b-icon-plus-circle-fill scale="1.4" class=""/>
            </b-col>
            <b-col cols=auto class="line icon plus" v-else>
              <b-icon-plus-circle-fill scale="1.4" class=""/>
            </b-col>
            <b-col cols=3>
              <b-form-input @change="updateLine(key, subkey, 'measure', $event )" :value="line.measure" :state="isValidPattern(line.measure)" />
            </b-col>
            <b-col cols=3>
              <b-form-input @change="updateLine(key, subkey, 'weight', $event )" :value="line.weight" type="number" />
            </b-col>
            <b-col cols=3>
              <b-form-input @change="updateLine(key, subkey, 'weight_measure', $event )" :value="line.weight_measure" placeholder="g"/>
            </b-col>
            <b-col cols=auto class="line icon trash show" @click="removeLine(key, subkey)">
              <b-icon-trash-fill scale="1.4" class=""/>
            </b-col>
          </b-row>
        </div>
      </b-col>
      <b-col cols="12" class="mt-4">
        <b-button variant="primary" @click="add">
          <b-icon-plus />
          Lägg till
        </b-button>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Converts } from '@/modules/use/auto-convert'
import { doc, getFirestore, onSnapshot, deleteField, updateDoc, arrayUnion, arrayRemove } from '@firebase/firestore'
import { uuidv4 } from '@firebase/util'
import { sortBy } from 'lodash'
import { defineComponent, reactive, ref, watch } from 'vue'

const Component = defineComponent({
  components: {
  },
  setup() {
    const store = getFirestore()

    const data = ref<Converts>({})
    const weightsRef = doc(store, 'veganflora', 'root', 'converts', 'weight')
    onSnapshot(weightsRef, result => {
      if (result.exists()) {
        data.value = result.data()
      }
    })

    function updateLine(key: string, subkey: string, attr: string, value: string | number) {
      updateDoc(weightsRef, { [`${key}.lines.${subkey}.${attr}`]: (typeof value === 'string' ? value.trim().toLowerCase() : value) })
    }
    function addLine(key: string) {
      updateDoc(weightsRef, { [`${key}.lines.${uuidv4()}`]: { measure: 'dl', weight: 0 } })
    }
    function removeLine(key: string, subkey: string) {
      updateDoc(weightsRef, { [`${key}.lines.${subkey}`]: deleteField() })
    }

    function update(key: string, field: 'name', value: string) {
      updateDoc(weightsRef, { [`${key}.${field}`]: value.trim().toLowerCase() })
    }

    function add() {
      const v: Converts = { [uuidv4()]: { name: '', lines: { [uuidv4()]: { measure: 'dl', weight: 0 } } } }
      updateDoc(weightsRef, v)
    }
    function remove(key: string) {
      updateDoc(weightsRef, { [key]: deleteField() })
    }
    function isValidPattern(regex: string) {
      try { return !!new RegExp(regex) ? null : null } catch { return false }
    }

    return {
      data,
      addLine,
      removeLine,
      updateLine,
      update,
      add,
      remove,
      sortBy,
      isValidPattern
    }
  }
})

export default Component
</script>

<style scoped>

.plus svg {
  color: var(--primary);
  margin-right: 12px;
}
.trash svg {
  color: var(--danger);
}
.icon {
  transition: all 100ms cubic-bezier(0.55, 0.055, 0.675, 0.19);
}
.icon:hover svg {
  scale: 1.2;
}
.icon:hover.show {
  cursor: pointer;
}
.icon:active svg {
  scale: 1.4;
}

.line.icon svg {
  visibility: hidden;
  margin-top: 12px;
  margin-left: 14px;
}
.line.icon.show svg {
  visibility: visible;
}

.item.icon {
  margin-top: 12px;
  margin-left: 14px;
  transition: all 100ms cubic-bezier(0.55, 0.055, 0.675, 0.19);
}
</style>
