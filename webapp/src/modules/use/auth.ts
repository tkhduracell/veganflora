import { useLocalStorage } from '@vueuse/core'
import { GoogleAuthProvider, getAuth, signInWithPopup, UserCredential,  } from 'firebase/auth'
import { onMounted, ref } from 'vue'

export function useAuth() {
    const email = useLocalStorage<string>('login', null)

    const auth = getAuth()

    const user = ref<UserCredential['user'] | null>(auth.currentUser)

    auth.onAuthStateChanged(auth => {
        user.value = auth
    })

    async function startLogin() {
        const provider = new GoogleAuthProvider()

        provider.addScope('email')
        provider.addScope('profile')

        if (email.value) {
          provider.setCustomParameters({ 'login_hint': email.value })
        }

        try {
          const result = await signInWithPopup(auth, provider)
          // The signed-in user info.
          user.value = result.user;
          if (result.user.email) {
              email.value = result.user.email
          }
        } catch (e) {
            throw e
        }

    }

    async function logout() {
        await auth.signOut();
        user.value = null;
    }

    return { user, startLogin, logout }
}
