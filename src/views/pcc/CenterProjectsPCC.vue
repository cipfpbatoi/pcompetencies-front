<script setup>
import { computed } from 'vue'
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

// Components
import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'
import PccCenterProjects from '@/components/PccCenterProjects.vue'

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)

// Computed
const isDone = computed(() => {
  return true
})
</script>

<template>
  <main class="border shadow view-main">
    <!-- Breadcrumb -->
    <AppBreadcrumb :actualStep="6" :done="isDone" />

    <!-- Header -->
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <!-- Contenido principal -->
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>6. Projectes de Centre</h2>

      <div class="alert alert-info mb-4">
        <i class="bi bi-info-circle-fill me-2"></i>
        <strong>Gestiona els projectes de centre associats a cada mòdul.</strong>
        <ul class="mb-0 mt-2">
          <li>Assigna quins projectes de centre es treballen en cada mòdul professional</li>
          <li>Pots afegir múltiples projectes a cada mòdul o eliminar-los individualment</li>
        </ul>
      </div>

      <PccCenterProjects v-if="pcc.id" :pcc-id="pcc.id" />
    </div>
  </main>
</template>

<style scoped>
.view-main {
  min-height: 100vh;
}
</style>
