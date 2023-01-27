import { initializeApp } from 'firebase/app'
import { PluginObject } from 'vue'

export default {
  install () {
    const config = {
      apiKey: "AIzaSyBscTLxKAvdSqbxDdb9j9Gl6N2bYXEsmQY",
      authDomain: "veganflora.firebaseapp.com",
      databaseURL: "https://veganflora.firebaseio.com",
      projectId: "veganflora",
      storageBucket: "veganflora.appspot.com",
      messagingSenderId: "520915943790",
      appId: "1:520915943790:web:fb1165582d009784ddc17f"
    }
    console.log('Initializing firebase app...')
    initializeApp(config)
  }
} as PluginObject<never>
