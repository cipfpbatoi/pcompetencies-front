<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/stores/data'
import PccIndividualTrainingPlans from '@/components/PccIndividualTrainingPlans.vue'

const router = useRouter()
const store = useDataStore()
const { pcc, cycle } = storeToRefs(store)

const goBack = () => {
  router.push({ name: 'selectSyllabus', query: { cycleId: cycle.value?.id } })
}

const hasPcc = computed(() => !!pcc.value?.id)
</script>

<template>
  <main class="border shadow view-main">
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName || cycle.completeName }}
    </div>

    <div class="p-lg-4 p-1 p-sm-0">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="mb-0"><i class="bi bi-mortarboard-fill me-2"></i>Plans Formatius Individuals</h2>
        <button type="button" class="btn btn-outline-secondary" @click="goBack">
          <i class="bi bi-arrow-left"></i> Tornar a la selecció
        </button>
      </div>

      <div class="alert alert-info mb-4">
        <i class="bi bi-info-circle-fill me-2"></i>
        Defineix, per a cada mòdul dualitzable amb programació, quins resultats d'aprenentatge i
        criteris d'avaluació formen part de cada pla formatiu individual.
      </div>

      <div v-if="!hasPcc" class="alert alert-warning mb-0">
        Cal seleccionar primer un cicle amb PCC creat des de la pàgina de selecció.
      </div>

      <PccIndividualTrainingPlans v-else :pcc-id="pcc.id" />
    </div>
  </main>
</template>

<style scoped>
.view-main {
  min-height: 100vh;
}
</style>
