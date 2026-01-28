<script setup>
import { computed } from 'vue'
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

// Components
import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'
import PccModuleOrganization from '@/components/PccModuleOrganization.vue'

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)

// Computed
const isDone = computed(() => {
  if (!pcc.value?.modules || !pcc.value?.moduleOrganizations) return false

  // Verificar que todos los módulos tengan organización definida
  return pcc.value.modules.every(module => {
    return pcc.value.moduleOrganizations.some(
      mo => mo.module?.code === module.code
    )
  })
})
</script>

<template>
  <main class="border shadow view-main">
    <!-- Breadcrumb -->
    <AppBreadcrumb :actualStep="3" :done="isDone" />

    <!-- Header -->
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <!-- Contenido principal -->
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>3. Organització dels Mòduls Professionals</h2>

      <div class="alert alert-info mb-4">
        <i class="bi bi-info-circle-fill me-2"></i>
        <strong>Defineix l'organització i distribució de cada mòdul professional del cicle.</strong>
        <p class="mb-0 mt-2">
          Per a cada mòdul has de definir:
        </p>
        <ul class="mb-0 mt-2">
          <li><strong>Distribució:</strong> Com es reparteixen les hores (ex: 2+9)</li>
          <li><strong>Hores d'aula i laboratori:</strong> Distribució de les hores setmanals</li>
          <li><strong>Idioma:</strong> Idioma en què s'imparteix el mòdul</li>
          <li><strong>Altres consideracions:</strong> Informació addicional si és necessària</li>
        </ul>
        <p class="mb-0 mt-2 text-danger">
          <i class="bi bi-exclamation-triangle-fill me-1"></i>
          <strong>Important:</strong> Has de definir l'organització per a tots els mòduls abans de continuar al següent pas.
        </p>
      </div>

      <!-- Componente de organización de módulos -->
      <PccModuleOrganization v-if="pcc.id" :pcc-id="pcc.id" />
    </div>
  </main>
</template>

<style scoped>
.view-main {
  min-height: 100vh;
}
</style>
