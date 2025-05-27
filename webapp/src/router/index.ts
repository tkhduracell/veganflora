import Vue from "vue"
import VueRouter, { type RouteConfig } from "vue-router"

import Index from "@/views/Index.vue"
import Menu from "@/views/Menu.vue"
import MenuShow from "@/views/MenuShow.vue"
import RecipeEdit from "@/views/RecipeEdit.vue"
import RecipeShow from "@/views/RecipeShow.vue"
import Groceries from "@/views/Groceries.vue"
import Units from "@/views/Units.vue"

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
	{
		path: "/",
		name: "index",
		component: Index,
	},
	{
		path: "/groceries",
		name: "groceries",
		component: Groceries,
	},
	{
		path: "/menu",
		name: "menu",
		component: Menu,
	},
	{
		path: "/menu/:week/:weekday/:meal",
		name: "menu-show",
		component: MenuShow,
	},
	{
		path: "/edit/:key",
		name: "edit",
		component: RecipeEdit,
	},
	{
		path: "/show/:key",
		name: "show",
		component: RecipeShow,
	},
	{
		path: "/new",
		name: "new",
		component: RecipeEdit,
	},
	{
		path: "/units",
		name: "units",
		component: Units,
	},
]

const router = new VueRouter({
	routes,
	mode: "history",
	scrollBehavior(_to, _from, savedPosition) {
		if (savedPosition) {
			return new Promise((resolve) => setTimeout(() => resolve(savedPosition), 300))
		}
		return { y: 0, x: 0 }
	},
})

export default router
