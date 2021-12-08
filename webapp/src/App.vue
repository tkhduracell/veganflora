<template>
  <div id="app">
    <b-navbar type="dark" variant="primary">
      <b-navbar-brand exact :to="{name: 'home'}">Veganflora</b-navbar-brand>

      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

      <b-collapse id="nav-collapse" is-nav>
        <b-navbar-nav class="navbar-left">
          <b-nav-item class="d-none d-sm-block" exact :to="{name: 'home'}">Hem</b-nav-item>
          <b-nav-item class="d-none d-sm-block" exact :to="{name: 'menu'}">Meny</b-nav-item>
          <b-nav-item class="d-none d-sm-block" exact :to="{name: 'groceries'}">Handlalista</b-nav-item>
        </b-navbar-nav>
        <b-navbar-nav class="ml-auto" v-if="isSupported">
          <b-nav-form>
            <b-button variant="primary" @click="toggle">
              <b-icon icon="fullscreen-exit" v-if="isFullscreen" />
              <b-icon icon="arrows-fullscreen" v-else />
            </b-button>
            <b-button-group>
              <b-button
                size="sm"
                :variant="!isActive ? 'success' : 'secondary'"
                :pressed="!isActive"
                @click="release()"
              >Off</b-button>
              <b-button
                size="sm"
                :variant="isActive ? 'success' : 'secondary'"
                :pressed="isActive"
                @click="request('screen')"
              >Awake</b-button>
            </b-button-group>
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
import { defineComponent } from '@vue/composition-api'
import { useWakeLock, useFullscreen } from '@vueuse/core'

export default defineComponent({
  setup() {
    const { isActive, isSupported, release, request } = useWakeLock()
    const { isFullscreen, enter, exit, toggle } = useFullscreen()

    return { isActive, isSupported, release, request, toggle, isFullscreen }
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
</style>
