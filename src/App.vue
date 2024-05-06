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
    if (window.location.pathname !== '/login') {
      this.reloadData()
    }
  },
  methods: {
    ...mapActions(useDataStore, ['reloadData'])
  }
}
</script>

<template>

  <div class="container-fluid h-100 px-lg-5">
    <header class="input-group mt-3 justify-content-center container-fluid">
      <img alt="CIP FP Batoi logo" class="logo m-lg-2 mx-auto d-none d-sm-block" src="/batoi_logo.png" height="100px" />
      <div class="m-2 col-10">
        <h1 class="text-xl-end">Programacions per competències</h1>
        <div class="wrapper navbar-expand">
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
.bordered {
  border: 1px solid black;
  padding: 5px;
  margin: 5px auto;
}
.error {
  color: red;
}

header {
  text-align: center;
}
.input-group {
  padding: 10px 10px;
}

.view-main {
  min-height: 500px;
}
</style>
