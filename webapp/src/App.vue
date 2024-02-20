<template>
  <div id="app">
    <b-navbar
      type="dark"
      variant="primary"
    >
      <b-navbar-brand
        exact
        :to="{name: 'home'}"
      >
        Veganflora
      </b-navbar-brand>

      <b-navbar-toggle target="nav-collapse" />

      <b-collapse
        id="nav-collapse"
        is-nav
      >
        <b-navbar-nav class="navbar-left">
          <b-nav-item
            class="d-none d-sm-block"
            exact
            :to="{name: 'home'}"
          >
            Hem
          </b-nav-item>
          <b-nav-item
            class="d-none d-sm-block"
            exact
            :to="{name: 'units'}"
          >
            Mått
          </b-nav-item>
          <b-nav-item
            class="d-none d-sm-block"
            exact
            :to="{name: 'menu'}"
          >
            Meny
          </b-nav-item>
          <b-nav-item
            class="d-none d-sm-block"
            exact
            :to="{name: 'groceries'}"
          >
            Handlalista
          </b-nav-item>
        </b-navbar-nav>
        <b-navbar-nav class="ml-auto">
          <b-nav-item class="">
            <b-button
              v-if="!user"
              size="sm"
              variant="success"
              @click="startLogin()"
            >
              Login
            </b-button>
            <div
              v-else
              class="profile"
            >
              <div
                class="displayName"
                @click="logout"
              >
                {{ user.displayName }}
              </div>
              <b-img
                fluid
                :src="user.photoURL"
                class="photoURL"
                rounded="circle"
              />
            </div>
          </b-nav-item>
          <b-nav-form v-if="isSupported">
            <b-button
              variant="primary"
              @click="toggle"
            >
              <b-icon
                v-if="isFullscreen"
                icon="fullscreen-exit"
              />
              <b-icon
                v-else
                icon="arrows-fullscreen"
              />
            </b-button>
          </b-nav-form>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>

    <div class="content">
      <router-view />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue'
import { useWakeLock, useFullscreen } from '@vueuse/core'
import { useAuth } from './modules/use/auth'

export default defineComponent({
  setup () {
    const { isActive, isSupported, release, request } = useWakeLock()
    const { isFullscreen, toggle } = useFullscreen()

    onMounted(() => request('screen').catch(() => console.warn('Unable active wakelock')))

    const { user, startLogin, logout } = useAuth()

    return { isActive, isSupported, release, request, toggle, isFullscreen, user, startLogin, logout }
  }
})
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
.content {
  margin: 30px 0;
}
.router-link-active {
  font-weight: bold;
}
.profile {
  display: flex;
  flex-direction: row-reverse;
  justify-content: center;
  align-items: center;
}
.profile .photoURL {
  margin: 0 10px 0 0;
  max-width: 37px;
  max-height: 37px;
}
</style>
