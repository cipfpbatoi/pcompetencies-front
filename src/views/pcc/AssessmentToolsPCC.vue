<script setup>
import { computed, ref } from 'vue'
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

const hasPcc = computed(() => Boolean(pcc.value?.id && pcc.value?.cycle?.id))
const showMissingPcc = computed(() => {
  const hasLoadedData = Boolean(
    pcc.value?.cycle || pcc.value?.modules || pcc.value?.agreedAssessmentTools
  )
  return hasLoadedData && !hasPcc.value
})

const showHelp = ref(false)
const helpContent = {
  title: "Ajuda - 4. Instruments d'Avaluació Consensuats",
  body: 'Defineix els instruments mínims d’avaluació comuns que s’utilitzaran al llarg dels mòduls del cicle i acorda el seu pes dins del procés d’avaluació. Aquests acords no impedixen que cada professorat puga utilitzar altres instruments complementaris en el seu mòdul.\n\nPer a cada instrument pots:\n\n<div class="help-list"><ul><li><strong>Assignar un percentatge,</strong> respectant els mínims establerts. També es pot consensuar la utilització d’un instrument sense necessitat d’assignar-li un pes mínim.</li><li><strong>Seleccionar els mòduls</strong> en què s’aplicarà. Si no se’n selecciona cap, s’entendrà que s’aplica a tots els mòduls del cicle. En cas de seleccionar-ne, haurà de ser com a mínim en dos mòduls.</li></ul></div>\n\n<div class="help-quote-label"><strong>Coses a tindre en compte</strong></div><blockquote class="help-quote">Els instruments han de ser coherents amb les metodologies acordades. Per exemple, si s’ha decidit aplicar l’aprenentatge servei en determinats mòduls, caldrà preveure instruments adequats per valorar aquestes activitats.</blockquote>'
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
    <!-- Breadcrumb - Paso 4 -->
    <AppBreadcrumb :actualStep="4" :done="isDone" />

    <!-- Header -->
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <!-- Contenido principal -->
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>
        4. Instruments d'Avaluació Consensuats
        <span @click="toggleHelp" class="cursor-pointer ms-2 help-icon" role="button" tabindex="0">
          <i class="bi bi-info-circle-fill text-info" />
        </span>
      </h2>

      <!-- Componente de instrumentos de evaluación -->
      <PccAssessmentTools v-if="hasPcc" :pcc-id="pcc.id" :cycle-id="pcc.cycle.id" />

      <div v-else-if="showMissingPcc" class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        No s'ha pogut carregar la informació del PCC
      </div>
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

:deep(.help-quote-label) {
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 0.25rem;
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

:deep(.help-list) {
  margin: 0.5rem 0 0 0;
}
</style>
