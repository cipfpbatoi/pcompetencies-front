<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/stores/data'
import PccIndividualTrainingPlans from '@/components/PccIndividualTrainingPlans.vue'

const props = defineProps({
  pccId: {
    type: Number,
    required: true
  }
})

const router = useRouter()
const store = useDataStore()
const { pcc, cycle } = storeToRefs(store)
const isLoadingPcc = ref(true)
const loadError = ref(false)

const goBack = () => {
  router.push({ name: 'selectSyllabus', query: { cycleId: cycle.value?.id } })
}

const hasPcc = computed(() => !!pcc.value?.id)

const loadPcc = async () => {
  isLoadingPcc.value = true
  loadError.value = false
  const loadedPcc = await store.loadPccById(props.pccId)
  loadError.value = !loadedPcc
  isLoadingPcc.value = false
}

watch(() => props.pccId, loadPcc, { immediate: true })
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
        Defineix, els mòdel de pla formatiu per a cada curs del cicle formatiu
      </div>

      <div v-if="isLoadingPcc" class="text-center py-4">
        <span class="spinner-border text-primary"></span>
      </div>

      <div v-else-if="loadError || !hasPcc" class="alert alert-warning mb-0">
        No s'ha pogut carregar el PCC indicat en l'enllaç.
      </div>

      <PccIndividualTrainingPlans v-else :pcc-id="pccId" />
    </div>
  </main>
</template>

<style scoped>
.view-main {
  min-height: 100vh;
}
</style>
