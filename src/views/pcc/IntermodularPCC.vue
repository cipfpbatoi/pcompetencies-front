<script setup>
import { computed } from 'vue'
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

// Components
import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'
import PccIntermodularGuide from '@/components/PccIntermodularGuide.vue'

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)

// Computed
const isDone = computed(() => {
  return !!pcc.value?.intermodularProjectGuide
})
</script>

<template>
  <main class="border shadow view-main">
    <!-- Breadcrumb -->
    <AppBreadcrumb :actualStep="8" :done="isDone" />

    <!-- Header -->
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <!-- Contenido principal -->
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>8. Guia del Projecte Intermodular</h2>

      <div class="alert alert-info mb-4">
        <i class="bi bi-info-circle-fill me-2"></i>
        <strong>Defineix la guia del projecte intermodular per al cicle.</strong>
        <ul class="mb-0 mt-2">
          <li><strong>Temporalització:</strong> Estableix quan es realitza el projecte, el pes i les observacions per a cada curs</li>
          <li><strong>Orientacions:</strong> Defineix per a cada mòdul les activitats de suport i orientació proposades per resultat d'aprenentatge</li>
        </ul>
      </div>

      <PccIntermodularGuide v-if="pcc.id" :pcc-id="pcc.id" />
    </div>
  </main>
</template>

<style scoped>
.view-main {
  min-height: 100vh;
}
</style>
