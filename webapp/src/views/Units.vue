<template>
  <b-container :class="{ 'converts': true, 'disabled': !user }">
    <h1>Måttenheter

      <small>{{ Object.keys(data).length }} st</small>

    </h1>
    <b-row v-if="data" class="clearfix">
      <b-col v-for="[key, items] in sortBy(Object.entries(data), ([k,]) => k)" :key="key" cols="4" class="mt-4">
        <b-form-input size="lg" :value="key" />

        <div v-for="({grams, unit}) in sortBy(items, i => i.unit)" :key="key + unit" class="mt-2">
          <b-row no-gutters class="">
            <b-col cols="3">
              <b-form-input :value="unit" />
            </b-col>
            <b-col cols="3">
              <b-form-input :value="grams" placeholder="g" type="number" />
            </b-col>
          </b-row>
        </div>
      </b-col>
    </b-row>
    <hr/>
    <b-row>
      <b-col>
        <b-form>
          <b-form-group label="JSON">
            <b-textarea v-model="manual" debounce="500" max-rows="5000" style="font-size: 0.75rem;"/>
          </b-form-group>
        </b-form>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { useAuth } from "@/modules/use/auth"
import type { Weights } from "@/modules/use/auto-convert"
import { doc, getFirestore, onSnapshot } from "@firebase/firestore"
import { debouncedWatch } from "@vueuse/core"
import { setDoc } from "firebase/firestore"
import { sortBy } from "lodash"
import { computed, defineComponent, ref } from "vue"

const Component = defineComponent({
	components: {},
	setup() {
		const store = getFirestore()
		const { user } = useAuth()

		const data = ref<Weights>({})

		const inputError = ref()
		const manual = computed<string>({
			get: () => JSON.stringify(data.value, null, 2),
			set: (s: string) => {
				try {
					data.value = JSON.parse(s)
					inputError.value = null
				} catch (e) {
					inputError.value = e
				}
			},
		})

		const weightsRef = doc(store, "veganflora", "root", "converts", "weight-v2")
		onSnapshot(weightsRef, (result) => {
			if (result.exists()) {
				data.value = result.data()
			}
		})

		debouncedWatch(
			data,
			async (x, prev) => {
				if (Object.keys(prev).length === 0) return

				console.log("Saving document")
				await setDoc(weightsRef, x)
			},
			{ maxWait: 5000, debounce: 1000 },
		)

		return {
			data,
			manual,
			inputError,
			sortBy,
			user,
		}
	},
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
