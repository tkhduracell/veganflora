import Vue from "vue"
import { BootstrapVue, IconsPlugin } from "bootstrap-vue"

import router from "./router"

import App from "./App.vue"

import "bootstrap/dist/css/bootstrap.css"
import "bootstrap-vue/dist/bootstrap-vue.css"
import VueFirebase from "./firebase-plugin"

Vue.use(VueFirebase)
Vue.use(BootstrapVue)
Vue.use(IconsPlugin)

Vue.config.productionTip = false

new Vue({
	router,
	render: (h) => h(App),
}).$mount("#app")
