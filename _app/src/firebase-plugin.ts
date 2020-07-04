import * as firebase from 'firebase/app'
import 'firebase/firestore'

import { PluginObject } from 'vue'

export default {
  install () {
    const config = {
      apiKey: 'AIzaSyB8Na9ZD8ZSfee7z_2TXjVRSMe5Q7CSXpM',
      authDomain: 'veganflora.firebaseapp.com',
      databaseURL: 'https://veganflora.firebaseio.com',
      projectId: 'veganflora',
      storageBucket: 'veganflora.appspot.com',
      messagingSenderId: '520915943790',
      appId: '1:520915943790:web:fb1165582d009784ddc17f'
    }
    console.log('Initializing firebase app...')
    firebase.initializeApp(config)

    /* Enable offline */
    const db = firebase.firestore()
    db.enablePersistence()
  }
} as PluginObject<never>
