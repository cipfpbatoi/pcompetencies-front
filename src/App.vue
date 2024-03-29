<script>
import { useDataStore } from './stores/data';
import { mapActions } from 'pinia';
import ShowMessages from './components/ShowMessages.vue'
import AppNav from './components/AppNav.vue'

export default {
  components: {
    ShowMessages,
    AppNav
  },
  mounted() {
    this.loadData()
  },
  methods: {
    ...mapActions(useDataStore, ['loadData'])
  }
}
</script>

<template>
  <div class="container">
    <header class="input-group">
      <img alt="CIP FP Batoi logo" class="logo" src="/batoi_logo.png" width="125" />
      <div>
        <h1>Programacions per competències</h1>
        <div class="wrapper">
          <AppNav />
        </div>
      </div>
    </header>
    <!-- <button @click="arregla" disabled>Arregla</button> -->

    <RouterView />
    <show-messages></show-messages>
  </div>
</template>

<style scoped>
@import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');
</style>
