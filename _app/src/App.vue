<template>
  <div id="app">
    <b-navbar type="dark" variant="primary">
      <b-navbar-brand exact :to="{name: 'home'}">Veganflora</b-navbar-brand>

      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

      <b-collapse id="nav-collapse" is-nav>
        <b-navbar-nav>
          <b-nav-item exact :to="{name: 'home'}">Hem</b-nav-item>
          <b-nav-item exact :to="{name: 'menu'}">Meny</b-nav-item>
          <b-nav-item exact :to="{name: 'groceries'}">Handlalista</b-nav-item>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>

    <div class="content">
      <router-view />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({})
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
