<script setup>
import { computed } from 'vue'
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

// Components
import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'
import PccTrainingPlan from '@/components/PccTrainingPlan.vue'

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)

// Computed
const isDone = computed(() => {
  return !!pcc.value?.trainingPlan
})
</script>

<template>
  <main class="border shadow view-main">
    <!-- Breadcrumb -->
    <AppBreadcrumb :actualStep="5" :done="isDone" />

    <!-- Header -->
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <!-- Contenido principal -->
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>5. Pla Formatiu d'Empresa</h2>

      <div class="alert alert-info mb-4">
        <i class="bi bi-info-circle-fill me-2"></i>
        <strong>Defineix el pla formatiu en l'empresa per al cicle.</strong>
        <ul class="mb-0 mt-2">
          <li><strong>Hores per curs:</strong> Distribueix les hores de formació en empresa entre 1r i 2n curs</li>
          <li><strong>Criteris d'assignació:</strong> Defineix els criteris per assignar alumnes a empreses. Els criteris de centre ja estan establerts pel PEC</li>
        </ul>
      </div>

      <!-- Componente de plan formativo -->
      <PccTrainingPlan v-if="pcc.id" :pcc-id="pcc.id" />
    </div>
  </main>
</template>

<style scoped>
.view-main {
  min-height: 100vh;
}
</style>
