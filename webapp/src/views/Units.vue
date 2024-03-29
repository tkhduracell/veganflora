<template>
  <b-container :class="{'converts': true, 'disabled': !user }">
    <h1>Måttenheter</h1>
    <b-row
      v-if="data"
      class="clearfix"
    >
      <b-col
        v-for="[key, item] in sortBy(Object.entries(data), ([k,]) => k)"
        :key="key"
        cols="12"
      >
        <b-row
          no-gutters
          class="mb-2 mt-2"
        >
          <b-col cols="10">
            <b-form-input
              size="lg"
              :value="item.name"
              :state="isValidPattern(item.name)"
              @input="update(key, 'name', $event)"
            />
          </b-col>
          <b-col
            cols="auto"
            class="item icon trash"
            @click="remove(key)"
          >
            <b-icon-trash-fill
              scale="1.4"
              class=""
            />
          </b-col>
        </b-row>
        <div
          v-for="([subkey, line], idx) in sortBy(Object.entries(item.lines), ([k,]) => k)"
          :key="key+subkey"
        >
          <b-row
            no-gutters
            class=""
          >
            <b-col
              v-if="idx === Object.keys(item.lines).length - 1"
              cols="auto"
              class="line icon plus show"
              @click="addLine(key)"
            >
              <b-icon-plus-circle-fill
                scale="1.4"
                class=""
              />
            </b-col>
            <b-col
              v-else
              cols="auto"
              class="line icon plus"
            >
              <b-icon-plus-circle-fill
                scale="1.4"
                class=""
              />
            </b-col>
            <b-col cols="3">
              <b-form-input
                :value="line.measure"
                :state="isValidPattern(line.measure)"
                @change="updateLine(key, subkey, 'measure', $event )"
              />
            </b-col>
            <b-col cols="3">
              <b-form-input
                :value="line.weight"
                type="number"
                @change="updateLine(key, subkey, 'weight', $event )"
              />
            </b-col>
            <b-col cols="3">
              <b-form-input
                :value="line.weight_measure"
                placeholder="g"
                @change="updateLine(key, subkey, 'weight_measure', $event )"
              />
            </b-col>
            <b-col
              cols="auto"
              class="line icon trash show"
              @click="removeLine(key, subkey)"
            >
              <b-icon-trash-fill
                scale="1.4"
                class=""
              />
            </b-col>
          </b-row>
        </div>
      </b-col>
      <b-col
        cols="12"
        class="mt-4"
      >
        <b-button
          variant="primary"
          :disabled="!user"
          @click="add"
        >
          <b-icon-plus />
          Lägg till
        </b-button>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { useAuth } from '@/modules/use/auth'
import { Converts } from '@/modules/use/auto-convert'
import { doc, getFirestore, onSnapshot, deleteField, updateDoc, arrayUnion, arrayRemove } from '@firebase/firestore'
import { uuidv4 } from '@firebase/util'
import { sortBy } from 'lodash'
import { defineComponent, reactive, ref, watch } from 'vue'

const Component = defineComponent({
  components: {
  },
  setup () {
    const store = getFirestore()
    const { user } = useAuth()

    const data = ref<Converts>({})
    const weightsRef = doc(store, 'veganflora', 'root', 'converts', 'weight')
    onSnapshot(weightsRef, result => {
      if (result.exists()) {
        data.value = result.data()
      }
    })

    function updateLine (key: string, subkey: string, attr: string, value: string | number) {
      if (!user.value) return
      updateDoc(weightsRef, { [`${key}.lines.${subkey}.${attr}`]: (typeof value === 'string' ? value.trim().toLowerCase() : value) })
    }
    function addLine (key: string) {
      if (!user.value) return
      updateDoc(weightsRef, { [`${key}.lines.${uuidv4()}`]: { measure: 'dl', weight: 0 } })
    }
    function removeLine (key: string, subkey: string) {
      if (!user.value) return
      updateDoc(weightsRef, { [`${key}.lines.${subkey}`]: deleteField() })
    }

    function update (key: string, field: 'name', value: string) {
      if (!user.value) return
      updateDoc(weightsRef, { [`${key}.${field}`]: value.trim().toLowerCase() })
    }

    function add () {
      if (!user.value) return
      const v: Converts = { [uuidv4()]: { name: '', lines: { [uuidv4()]: { measure: 'dl', weight: 0 } } } }
      updateDoc(weightsRef, v)
    }
    function remove (key: string) {
      if (!user.value) return
      updateDoc(weightsRef, { [key]: deleteField() })
    }
    function isValidPattern (name?: string) {
      return (name ?? '').trim().length > 0
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
      isValidPattern,
      user
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

.converts.disabled .icon {
  opacity: 0.4;
}

</style>
