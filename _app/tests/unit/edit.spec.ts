import { shallowMount } from '@vue/test-utils'
import RecipeEdit from '@/views/RecipeEdit.vue'

import { createLocalVue } from '@vue/test-utils'
import BootstrapVue from 'bootstrap-vue'

const localVue = createLocalVue()
localVue.use(BootstrapVue)

describe('RecipeEdit.vue', () => {
  it('renders text', () => {
    const wrapper = shallowMount(RecipeEdit, { localVue })
    expect(wrapper.text()).toContain('Nytt recept')
  })
})
