<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import * as yup from 'yup'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

// Components
import ModalComponent from '@/components/ModalComp.vue'
import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'
import PccModuleManager from '@/components/PccModuleManager.vue'

// Store
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

// Composables
import { useFormValidation } from '@/composables/useFormValidation'

// ==========================================
// 🏪 STORE
// ==========================================
const store = useDataStore()
const { pcc, cycle } = storeToRefs(store)
const { savePccOportunities, savePccEnvironment, refreshPccByCycleId, fetchCycle } = store

// ==========================================
// 📋 VALIDACIÓN
// ==========================================
const opportunitiesSchema = yup.object({
  opportunities: yup
    .string()
    .trim()
    .required('Has de posar la contextualització de la programació')
    .min(20, 'Al menys han de tindre 20 caràcters')
})

const environmentSchema = yup.object({
  environment: yup
    .string()
    .trim()
    .required("Has de posar l'entorn correcte")
    .min(15, 'Al menys han de tindre 15 caràcters')
})

const opportunitiesValidation = useFormValidation(opportunitiesSchema)
const environmentValidation = useFormValidation(environmentSchema)

// Si quieres, desestructura para que sea más cómodo:
const {
  errors: opportunitiesErrors,
  validate: validateOpportunities,
  handleServerError: handleOppServerError,
  clearErrors: clearOppErrors
} = opportunitiesValidation

const {
  errors: environmentErrors,
  validate: validateEnvironment,
  handleServerError: handleEnvServerError,
  clearErrors: clearEnvErrors
} = environmentValidation

// ==========================================
// 📊 ESTADO LOCAL
// ==========================================
const modalFields = reactive({
  opportunities: '',
  environment: ''
})

const isLoadingPccContext = ref(true)

// CKEditor
const editor = ClassicEditor
const editorConfig = {
  toolbar: [
    'heading',
    '|',
    'bold',
    'italic',
    'link',
    'bulletedList',
    'numberedList',
    '|',
    'blockQuote',
    'insertTable',
    '|',
    'undo',
    'redo'
  ],
  language: 'ca'
}

// ==========================================
// 🔧 COMPUTED
// ==========================================
const isDone = computed(() => {
  return !!(
    pcc.value.opportunitiesAndTechnologicalEvolution &&
    pcc.value.socioeconomicAndProfessionalEnvironment
  )
})

// ==========================================
// 🎬 LIFECYCLE
// ==========================================
const syncModalFields = () => {
  modalFields.opportunities = pcc.value.opportunitiesAndTechnologicalEvolution || ''
  modalFields.environment = pcc.value.socioeconomicAndProfessionalEnvironment || ''
}

const loadPccContext = async () => {
  const cycleId = pcc.value?.cycle?.id || cycle.value?.id || localStorage.pccCycleId

  try {
    if (!pcc.value?.id && cycleId) {
      await refreshPccByCycleId(cycleId)
    }

    const pccCycleId = pcc.value?.cycle?.id || cycleId
    if (
      pccCycleId &&
      (!cycle.value?.id ||
        String(cycle.value.id) !== String(pccCycleId) ||
        !Array.isArray(cycle.value?.modules) ||
        cycle.value.modulesFilteredByDepartment)
    ) {
      await fetchCycle(pccCycleId, 'presential', { filterByDepartment: false })
    }
  } finally {
    isLoadingPccContext.value = false
  }
}

onMounted(async () => {
  syncModalFields()
  await loadPccContext()
})

watch(
  () => pcc.value?.id,
  () => {
    syncModalFields()
  }
)

// ==========================================
// 🎯 MODALES - Sistema agrupado
// ==========================================

// Referencias a los modales
const pccOpportunitiesModalRef = ref(null)
const pccEnvironmentModalRef = ref(null)

// Mapa para acceso dinámico
const modalRefs = {
  opportunities: pccOpportunitiesModalRef,
  environment: pccEnvironmentModalRef
}

// Información de configuración de modales
const modalsConfig = {
  opportunities: {
    modalId: 'opportunitiesModal',
    title: "1.3 Oportunitats d'ocupació i evolució tecnològica",
    size: 'lg'
  },
  environment: {
    modalId: 'environmentModal',
    title: "1.2 Entorn socioeconòmic i professional del cicle i àrea d'influència",
    size: 'lg'
  }
}

// Modal de ayuda (simple)
const showHelp = ref(false)
const activeHelpKey = ref('')
const helpContent = {
  modules: {
    title: 'Ajuda - 1.1 Mòduls del PCC',
    body: "Has d'indicar tots els mòduls que s'inclouen al cicle formatiu. Recordant que d'un any a altre pot canviar el mòdul optatiu."
  },
  environment: {
    title: "Ajuda - 1.2 Entorn socioeconòmic i professional del cicle i àrea d'influència",
    body: "Aquest apartat ha de descriure el teixit empresarial de la ciutat i la comarca, així com el tipus d'empreses que poden contractar el nostre alumnat. Ha d'ajudar a entendre per què el cicle és necessari en aquest entorn.\n\nInclou informació sobre: sectors productius predominants; tipus d'empreses (majoritàriament pimes); necessitats de professionals qualificats; relació amb empreses o entitats de referència de la zona; connexió entre la formació del cicle i la realitat laboral.\n\n<div class=\"help-quote-label\">Exemple curt</div><blockquote class=\"help-quote\">L'entorn es caracteritza per un predomini de xicotetes i mitjanes empreses industrials i de serveis que demanden professionals amb formació tècnica actualitzada i capacitat d'adaptació als canvis tecnològics.</blockquote>"
  },
  opportunities: {
    title: "Ajuda - 1.3 Oportunitats d'ocupació i evolució tecnològica",
    body: 'Aquest apartat ha d\'explicar de què poden treballar els titulats i com estan evolucionant aquests llocs de treball. Ha de mirar al present però també a les tendències de futur.\n\nCal parlar de:<ul class="help-list"><li>Eixides professionals més habituals a l\'entorn proper.</li><li>Possibilitats d\'inserció laboral després de la FE.</li><li>Principals canvis tecnològics o organitzatius del sector.</li><li>Competències que cada vegada valoren més les empreses.</li><li>Importància de l\'actualització i la formació contínua.</li></ul>\n\n<div class="help-quote-label">Exemple curt</div><blockquote class="help-quote">Les empreses de l\'entorn presenten una demanda creixent de titulats del cicle, especialment en activitats vinculades a la digitalització i la incorporació de noves tecnologies, fet que implica una renovació constant de les competències professionals.</blockquote>'
  }
}

const activeHelp = computed(() => helpContent[activeHelpKey.value] || null)
const helpParagraphs = computed(() => {
  if (!activeHelp.value?.body) return []
  return activeHelp.value.body.split('\n\n').filter(Boolean)
})

// Métodos genéricos para manejar modales
const showModal = (modalKey) => {
  modalRefs[modalKey].value?.show()
}

const hideModal = (modalKey) => {
  modalRefs[modalKey].value?.hide()
}

const handleModalClose = (modalKey) => {
  if (modalKey === 'opportunities') clearOppErrors()
  if (modalKey === 'environment') clearEnvErrors()
}

// Toggle del modal de ayuda
const toggleHelp = (helpKey) => {
  if (helpKey && activeHelpKey.value !== helpKey) {
    activeHelpKey.value = helpKey
    showHelp.value = true
    return
  }
  showHelp.value = !showHelp.value
}

const closeHelp = () => {
  showHelp.value = false
  activeHelpKey.value = ''
}

// ==========================================
// 🔧 MÉTODOS DE GUARDADO
// ==========================================

// Guarda oportunidades
const saveOpportunitiesData = async () => {
  const isValid = await validateOpportunities({ opportunities: modalFields.opportunities })
  if (!isValid) return

  try {
    const response = await savePccOportunities(pcc.value.id, modalFields.opportunities)
    if (response === 'ok') {
      hideModal('opportunities')
      clearOppErrors()
    } else {
      handleOppServerError(response)
    }
  } catch (error) {
    console.error('Error al guardar contexto:', error)
    handleOppServerError(error)
  }
}

const saveEnvironmentData = async () => {
  const isValid = await validateEnvironment({ environment: modalFields.environment })
  if (!isValid) return

  try {
    const response = await savePccEnvironment(pcc.value.id, modalFields.environment)
    if (response === 'ok') {
      hideModal('environment')
      clearEnvErrors()
    } else {
      handleEnvServerError(response)
    }
  } catch (error) {
    console.error('Error al guardar entorno:', error)
    handleEnvServerError(error)
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <!-- ✅ MODAL OPORTUNIDADES -->
    <ModalComponent
      ref="pccOpportunitiesModalRef"
      v-bind="modalsConfig.opportunities"
      @save="saveOpportunitiesData"
      @close="handleModalClose('opportunities')"
    >
      <div class="p-2 text-center">
        <ckeditor
          class="help-editor"
          :editor="editor"
          v-model="modalFields.opportunities"
          :config="editorConfig"
        />
        <p v-if="opportunitiesErrors.opportunities" class="error mt-2">
          {{ opportunitiesErrors.opportunities }}
        </p>
      </div>
    </ModalComponent>

    <!-- ✅ MODAL ENTORNO -->
    <ModalComponent
      ref="pccEnvironmentModalRef"
      v-bind="modalsConfig.environment"
      @save="saveEnvironmentData"
      @close="handleModalClose('environment')"
    >
      <div class="p-2 text-center">
        <ckeditor
          class="help-editor"
          :editor="editor"
          v-model="modalFields.environment"
          :config="editorConfig"
        />
        <p v-if="environmentErrors.environment" class="error mt-2">
          {{ environmentErrors.environment }}
        </p>
      </div>
    </ModalComponent>

    <!-- ✅ BREADCRUMB -->
    <AppBreadcrumb :actualStep="1" :done="isDone" />

    <!-- ✅ HEADER -->
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <!-- ✅ CONTENIDO PRINCIPAL -->
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>1. Contextualització del cicle i mòduls del PCC</h2>

      <div v-if="isLoadingPccContext" class="alert alert-info d-flex align-items-center gap-2">
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Carregant dades del PCC...
      </div>

      <!-- Gestión de módulos del PCC -->
      <PccModuleManager
        v-else-if="pcc.id"
        :pcc-id="pcc.id"
        class="mb-4"
        @help="toggleHelp('modules')"
      />

      <!-- 1.1 Entorn -->
      <div class="card text-center mb-2">
        <div class="card-header pcc fw-bold text-uppercase text-white text-start">
          1.2 Entorn socioeconòmic i professional del cicle a Alcoi i àrea d'influència
          <span
            @click="toggleHelp('environment')"
            class="cursor-pointer ms-2"
            role="button"
            tabindex="0"
          >
            <i class="bi bi-info-circle-fill" />
          </span>
        </div>
        <div class="card-body">
          <p
            v-if="pcc.socioeconomicAndProfessionalEnvironment"
            class="text-start"
            v-html="pcc.socioeconomicAndProfessionalEnvironment"
          />
          <p v-else>Has d'indicar l'entorn del cicle a Alcoi i comarca</p>
        </div>
        <div class="card-footer text-muted">
          <button
            @click="showModal('environment')"
            class="btn btn-success"
            title="Afegir/Modificar entorn del cicle"
          >
            <i class="bi bi-pencil-fill me-2" />
            Afegir/Modificar entorn del cicle
          </button>
        </div>
      </div>

      <!-- 1.2 Oportunitats -->
      <div class="card text-center mb-2">
        <div class="card-header pcc fw-bold text-uppercase text-white text-start">
          1.3 Oportunitats d'ocupació i evolució tecnològica o productiva
          <span
            @click="toggleHelp('opportunities')"
            class="cursor-pointer ms-2"
            role="button"
            tabindex="0"
          >
            <i class="bi bi-info-circle-fill" />
          </span>
        </div>
        <div class="card-body">
          <p
            v-if="pcc.opportunitiesAndTechnologicalEvolution"
            class="text-start"
            v-html="pcc.opportunitiesAndTechnologicalEvolution"
          />
          <p v-else>
            Ha d'indicar les oportunitats d'ocupació i l'evolució tecnològica en la comarca
          </p>
        </div>
        <div class="card-footer text-muted">
          <button
            @click="showModal('opportunities')"
            class="btn btn-success"
            title="Afegir/Modificar oportunitats d'ocupació"
          >
            <i class="bi bi-pencil-fill me-2" />
            Afegir/Modificar oportunitats d'ocupació
          </button>
        </div>
      </div>
    </div>
  </main>

  <!-- ✅ MODAL DE AYUDA (Simple, con v-if) -->
  <Teleport to="body">
    <div v-if="showHelp">
      <div class="modal d-block modal-lg" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title mx-auto">
                <i class="bi bi-info-circle-fill me-2" />
                {{ activeHelp?.title || 'Ajuda' }}
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
              <button type="button" class="btn btn-success" @click="closeHelp">
                <i class="bi bi-x-circle me-2" />
                Tancar
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- Fondo oscuro -->
      <div class="modal-backdrop fade show" @click="closeHelp" />
    </div>
  </Teleport>
</template>

<style scoped>
.error {
  color: #dc3545;
  font-size: 0.875rem;
  font-weight: 500;
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  opacity: 0.8;
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
  margin: 0.5rem 0 0 1.25rem;
}

.help-editor {
  width: 100%;
  margin: 0 auto;
}
</style>
