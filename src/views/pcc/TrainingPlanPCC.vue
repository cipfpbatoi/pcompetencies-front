<script setup>
import { computed, ref } from 'vue'
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

const showHelp = ref(false)
const helpContent = {
  title: "Ajuda - 5. Pla Formatiu d'Empresa",
  body: 'Defineix l’organització general de la formació en empresa per als mòduls del cicle.\n\n<strong>Hores per curs</strong>\n\nIndica la distribució de les hores de formació en empresa entre primer i segon curs. La decisió pot justificar-se segons la progressió dels aprenentatges, el nivell d’autonomia previst per a l’alumnat o l’organització temporal del cicle.\n\n<strong>Resta de l’alumnat</strong>\n\nEn aquest apartat cal establir els criteris d’assignació per a l’alumnat que no aporta empresa pròpia ni es troba en situacions amb requisits específics del centre de treball.\n\nLa descripció ha d’indicar, de manera general, com es realitzarà la distribució de les places disponibles, garantint objectivitat, adequació al perfil formatiu i equitat.\n\n<div class="help-quote"><strong>A tall orientatiu, es poden considerar aspectes com la nota obtinguda, el grau d’assoliment dels resultats d’aprenentatge o altres indicadors acadèmics i professionals.</strong></div>'
}
const helpParagraphs = computed(() => {
  if (!helpContent.body) return []
  return helpContent.body.split('\n\n').filter(Boolean)
})

const toggleHelp = () => {
  showHelp.value = !showHelp.value
}

const closeHelp = () => {
  showHelp.value = false
}
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
      <h2>
        5. Pla Formatiu d'Empresa
        <span @click="toggleHelp" class="cursor-pointer ms-2 help-icon" role="button" tabindex="0">
          <i class="bi bi-info-circle-fill text-info" />
        </span>
      </h2>

      <!-- Componente de plan formativo -->
      <PccTrainingPlan v-if="pcc.id" :pcc-id="pcc.id" />
    </div>
  </main>

  <Teleport to="body">
    <div v-if="showHelp">
      <div class="modal d-block modal-lg" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title mx-auto">
                <i class="bi bi-info-circle-fill me-2" />
                {{ helpContent.title }}
              </h5>
            </div>
            <div class="modal-body">
              <p v-if="helpParagraphs.length === 0" class="text-muted">
                No hi ha contingut d'ajuda disponible.
              </p>
              <div
                v-for="(paragraph, index) in helpParagraphs"
                :key="index"
                class="text-muted mb-3"
                v-html="paragraph"
              />
            </div>
            <div class="modal-footer mx-auto">
              <button type="button" class="btn btn-info btn-lg help-close-btn" @click="closeHelp">
                <i class="bi bi-x-circle me-2" />
                Tancar
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="closeHelp" />
    </div>
  </Teleport>
</template>

<style scoped>
.view-main {
  min-height: 100vh;
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  opacity: 0.8;
}

.help-icon {
  font-size: 1.1rem;
  line-height: 1;
  padding: 0.25rem 0.5rem 0.25rem 0;
}

.help-close-btn {
  font-size: 1rem;
}

:deep(.help-list) {
  margin: 0.5rem 0 0 0;
}

:deep(.help-quote) {
  margin: 0;
  padding: 0.75rem 1rem;
  border-left: 6px solid #0dcaf0;
  background-color: #f8f9fa;
  color: #495057;
  font-style: italic;
  border-radius: 0.25rem;
}
</style>
