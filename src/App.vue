<script>
import { useDataStore } from './stores/data'
import { mapActions } from 'pinia'
import ShowMessages from './components/ShowMessages.vue'
import AppNav from './components/AppNav.vue'
import AppLocationBreadcrumb from './components/AppLocationBreadcrumb.vue'

export default {
  components: {
    ShowMessages,
    AppNav,
    AppLocationBreadcrumb
  },
  async mounted() {
    if (
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/public/syllabus') &&
      !window.location.pathname.startsWith('/api/public/pcc')
    ) {
      if (localStorage.token) {
        await this.loadData()
      } else {
        this.$router.push('/login')
      }
    }
  },
  computed: {
    title() {
      return window.location.pathname.includes('pcc')
        ? 'Projecte Curricular de Centre'
        : 'Programacions per competències'
    }
  },
  methods: {
    ...mapActions(useDataStore, ['loadData'])
  }
}
</script>

<template>
  <div class="container-fluid h-100 px-lg-5">
    <header
      class="app-header mt-3 d-flex flex-wrap align-items-center justify-content-between gap-3"
    >
      <div class="d-flex align-items-center gap-3">
        <img
          alt="CIP FP Batoi logo"
          class="logo d-none d-sm-block"
          src="/batoi_logo.png"
          height="60px"
        />
        <h1 class="h4 fw-bold m-0">{{ title }}</h1>
      </div>
      <div>
        <AppNav />
      </div>
    </header>
    <AppLocationBreadcrumb />
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

.app-header {
  padding-bottom: 10px;
  border-bottom: 1px solid #dee2e6;
}

/* Sota el trencament lg, l'AppNav ja es mostra centrat (text-lg-end/justify-content-lg-end
   deixen d'aplicar-se): apilem títol i navegació a ample complet en compte de mantindre-les
   forçades en la mateixa fila, on quedaven comprimides */
@media (max-width: 991.98px) {
  .app-header {
    flex-direction: column;
    align-items: stretch !important;
  }
  .app-header > div {
    justify-content: center !important;
  }
}

.view-main {
  min-height: 500px;
}
</style>

<style>
.pcc {
  background-color: #2c4a7a;
  border-color: #1f3b60;
}
</style>
