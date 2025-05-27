import { ArgumentsType } from "@vueuse/core"
import { type FirebaseOptions, initializeApp } from "firebase/app"
import { initializeFirestore, persistentLocalCache } from "firebase/firestore"
import type { PluginObject } from "vue"

export default {
	install() {
		const config = {
			apiKey: "AIzaSyBscTLxKAvdSqbxDdb9j9Gl6N2bYXEsmQY",
			authDomain: "veganflora.firebaseapp.com",
			databaseURL: "https://veganflora.firebaseio.com",
			projectId: "veganflora",
			storageBucket: "veganflora.appspot.com",
			messagingSenderId: "520915943790",
			appId: "1:520915943790:web:fb1165582d009784ddc17f",
		} satisfies FirebaseOptions

		console.log("Initializing firebase app...")
		const app = initializeApp(config)

		initializeFirestore(app, { localCache: persistentLocalCache() })
	},
} as PluginObject<never>
