<script setup>
import { computed } from 'vue'
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

// Components
import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'
import PccAssessmentTools from '@/components/PccAssessmentTools.vue'

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)

// Computed - El paso está completo si todos los obligatorios están configurados
const isDone = computed(() => {
  // Nota: La validación real se hará cuando el backend esté implementado
  // Por ahora consideramos que está done si existe el PCC
  return !!pcc.value?.id
})
</script>

<template>
  <main class="border shadow view-main">
    <!-- Breadcrumb - Paso 4 -->
    <AppBreadcrumb :actualStep="4" :done="isDone" />

    <!-- Header -->
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <!-- Contenido principal -->
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>4. Instruments d'Avaluació Consensuats</h2>

      <div class="alert alert-info mb-4">
        <i class="bi bi-info-circle-fill me-2"></i>
        <strong>Defineix els instruments d'avaluació que s'utilitzaran en el projecte curricular.</strong>
        <p class="mb-0 mt-2">
          Per a cada instrument pots:
        </p>
        <ul class="mb-0 mt-2">
          <li><strong>Assignar un percentatge:</strong> Respectant els mínims establerts</li>
          <li><strong>Seleccionar mòduls:</strong> Indica a quins mòduls s'aplica (mínim 2 o cap per aplicar a tots)</li>
        </ul>
        <p class="mb-0 mt-2 text-danger">
          <i class="bi bi-exclamation-triangle-fill me-1"></i>
          <strong>Important:</strong> Els instruments obligatoris han d'estar configurats obligatòriament.
        </p>
      </div>

      <!-- Componente de instrumentos de evaluación -->
      <PccAssessmentTools
        v-if="pcc.id && pcc.cycle?.id"
        :pcc-id="pcc.id"
        :cycle-id="pcc.cycle.id"
      />

      <div v-else class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        No s'ha pogut carregar la informació del PCC
      </div>
    </div>
  </main>
</template>

<style scoped>
.view-main {
  min-height: 100vh;
}
</style>
