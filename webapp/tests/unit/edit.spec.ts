import { shallowMount, createLocalVue } from '@vue/test-utils'
import RecipeEdit from '@/views/RecipeEdit.vue'

import BootstrapVue from 'bootstrap-vue'
import VueRouter from 'vue-router'

const localVue = createLocalVue()
localVue.use(BootstrapVue)
localVue.use(VueRouter)

jest.mock('vue-router/composables', () => ({
  useRoute: () => ({
    params: { key: '' },
  }),
  useRouter: () => ({ push: () => null })
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: () => {},
  doc: () => {},
  onSnapshot: () => {},
  getDoc: () => Promise.resolve({ exists: () => true, data: () => ({}) })
}));

describe('RecipeEdit.vue', () => {
  it('renders text', () => {
    const wrapper = shallowMount(RecipeEdit, {
      localVue,
    })
    expect(wrapper.text()).toContain('Nytt Recept')
  })
})
