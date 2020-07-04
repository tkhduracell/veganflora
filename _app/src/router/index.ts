import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'

import Home from '@/views/Home.vue'
import Menu from '@/views/Menu.vue'
import MenuShow from '@/views/MenuShow.vue'
import RecipeEdit from '@/views/RecipeEdit.vue'
import Groceries from '@/views/Groceries.vue'

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/groceries',
    name: 'groceries',
    component: Groceries
  },
  {
    path: '/menu',
    name: 'menu',
    component: Menu
  },
  {
    path: '/menu/:week/:weekday/:meal',
    name: 'menu-show',
    component: MenuShow
  },
  {
    path: '/edit/:key',
    name: 'edit',
    component: RecipeEdit
  },
  {
    path: '/new',
    name: 'new',
    component: RecipeEdit
  }
]

const router = new VueRouter({
  routes
})

export default router
