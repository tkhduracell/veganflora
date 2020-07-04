import Vue from 'vue'
import VueCompositionApi from '@vue/composition-api'
import { BootstrapVue } from 'bootstrap-vue'

import router from './router'
import store from './store'

import App from './App.vue'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import VueFirebase from './firebase-plugin'

Vue.use(VueFirebase)
Vue.use(VueCompositionApi)
Vue.use(BootstrapVue)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
