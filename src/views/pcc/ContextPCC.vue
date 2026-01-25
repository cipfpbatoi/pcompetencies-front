<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import * as yup from 'yup'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

// Components
import ModalComponent from '@/components/ModalComp.vue'
import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'

// Store
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

// Composables
import { useFormValidation } from '@/composables/useFormValidation'

// ==========================================
// 🏪 STORE
// ==========================================
const store = useDataStore()
const { pcc } = storeToRefs(store)
const { savePccOportunities, savePccEnvironment } = store

// ==========================================
// 📋 VALIDACIÓN
// ==========================================
const opportunitiesSchema = yup.object({
  opportunities: yup
    .string()
    .trim()
    .required('Has de posar la contextualització de la programació')
    .min(20, 'Al menys han de tindre 20 caràcters'),
})

const environmentSchema = yup.object({
  environment: yup
    .string()
    .trim()
    .required("Has de posar l'entorn correcte")
    .min(15, 'Al menys han de tindre 15 caràcters'),
})

const opportunitiesValidation = useFormValidation(opportunitiesSchema)
const environmentValidation = useFormValidation(environmentSchema)

// Si quieres, desestructura para que sea más cómodo:
const {
  errors: opportunitiesErrors,
  validate: validateOpportunities,
  handleServerError: handleOppServerError,
  clearErrors: clearOppErrors,
} = opportunitiesValidation

const {
  errors: environmentErrors,
  validate: validateEnvironment,
  handleServerError: handleEnvServerError,
  clearErrors: clearEnvErrors,
} = environmentValidation


// ==========================================
// 📊 ESTADO LOCAL
// ==========================================
const modalFields = reactive({
  opportunities: '',
  environment: ''
})

// CKEditor
const editor = ClassicEditor
const editorConfig = {
  toolbar: [
    'heading', '|',
    'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
    'blockQuote', 'insertTable', '|',
    'undo', 'redo'
  ],
  language: 'ca'
}

// ==========================================
// 🔧 COMPUTED
// ==========================================
const isDone = computed(() => {
  return pcc.value.opportunitiesAndTechnologicalEvolution && pcc.value.socioeconomicAndProfessionalEnvironment
})

// ==========================================
// 🎬 LIFECYCLE
// ==========================================
onMounted(() => {
  modalFields.opportunities = pcc.value.opportunitiesAndTechnologicalEvolution || ''
  modalFields.environment = pcc.value.socioeconomicAndProfessionalEnvironment || ''
})

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
    title: 'Oportunitats d\'ocupació i evolució tecnològica',
    size: 'lg'
  },
  environment: {
    modalId: 'environmentModal',
    title: 'Entorn socioeconòmic i professional',
    size: 'lg'
  }
}

// Modal de ayuda (simple)
const showHelp = ref(false)

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
const toggleHelp = () => {
  showHelp.value = !showHelp.value
}

const closeHelp = () => {
  showHelp.value = false
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
    <ModalComponent ref="pccOpportunitiesModalRef" v-bind="modalsConfig.opportunities" @save="saveOpportunitiesData"
      @close="handleModalClose('opportunities')">
      <div class="row p-2 text-center">
        <ckeditor :editor="editor" v-model="modalFields.opportunities" :config="editorConfig" />
        <p v-if="opportunitiesErrors.opportunities" class="error mt-2">
          {{ opportunitiesErrors.opportunities }}
        </p>

      </div>
    </ModalComponent>

    <!-- ✅ MODAL ENTORNO -->
    <ModalComponent ref="pccEnvironmentModalRef" v-bind="modalsConfig.environment" @save="saveEnvironmentData"
      @close="handleModalClose('environment')">
      <div class="row p-2 text-center">
        <ckeditor :editor="editor" v-model="modalFields.environment" :config="editorConfig" />
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
      <h2>1. Contextualització</h2>

      <!-- 1.1 Entorn -->
      <div class="card text-center mb-2">
        <div class="card-header pcc fw-bold text-uppercase text-white text-start">
          1.1 Entorn socioeconòmic i professional del cicle a Alcoi i àrea d'influència
        </div>
        <div class="card-body">
          <p v-if="pcc.socioeconomicAndProfessionalEnvironment" class="text-start"
            v-html="pcc.socioeconomicAndProfessionalEnvironment" />
          <p v-else>
            Has d'indicar l'entorn del cicle a Alcoi i comarca
          </p>
        </div>
        <div class="card-footer text-muted">
          <button @click="showModal('environment')" class="btn btn-success" title="Afegir/Modificar entorn del cicle">
            <i class="bi bi-pencil-fill me-2" />
            Afegir/Modificar entorn del cicle
          </button>
        </div>
      </div>

      <!-- 1.2 Oportunitats -->
      <div class="card text-center mb-2">
        <div class="card-header pcc fw-bold text-uppercase text-white text-start">
          1.2 Oportunitats d'ocupació i evolució tecnològica o productiva
          <span @click="toggleHelp" class="cursor-pointer ms-2" role="button" tabindex="0">
            <i class="bi bi-info-circle-fill" />
          </span>
        </div>
        <div class="card-body">
          <p v-if="pcc.opportunitiesAndTechnologicalEvolution" class="text-start"
            v-html="pcc.opportunitiesAndTechnologicalEvolution" />
          <p v-else>
            Ha d'indicar les oportunitats d'ocupació i l'evolució tecnològica en la comarca
          </p>
        </div>
        <div class="card-footer text-muted">
          <button @click="showModal('opportunities')" class="btn btn-success"
            title="Afegir/Modificar oportunitats d'ocupació">
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
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title mx-auto">
                <i class="bi bi-info-circle-fill me-2" />
                Directrius per a Contextualitzar el Grup-Classe
              </h5>
            </div>
            <div class="modal-body">
              <p class="text-muted">
                Aquestes són opcions suggerides per a ajudar a contextualitzar el grup-classe.
                No són obligatòries, sinó orientatives.
              </p>
              <ul class="list-group">
                <li class="list-group-item">
                  <strong>Nombre d'alumnes:</strong> Indica quants estudiants hi ha al grup.
                </li>
                <li class="list-group-item">
                  <strong>Distribució per sexe i edat:</strong>
                  Descriu com es distribueixen els alumnes segons el sexe i les franges d'edat principals.
                </li>
                <li class="list-group-item">
                  <strong>Diversitat lingüística:</strong> Enumera els idiomes predominants al grup.
                </li>
                <li class="list-group-item">
                  <strong>Interessos del grup:</strong>
                  Especifica si busquen treballar, anar a la universitat o algun altre objectiu.
                </li>
                <li class="list-group-item">
                  <strong>Dificultats amb els idiomes cooficials:</strong>
                  Descriu possibles barreres relacionades amb idiomes oficials o cooficials.
                </li>
                <li class="list-group-item">
                  <strong>Situació laboral i procedència:</strong>
                  Menciona si treballen, la seua formació prèvia o d'on venen.
                </li>
                <li class="list-group-item">
                  <strong>Repetidors o convalidacions:</strong>
                  Indica si hi ha estudiants que repetixen curs o que tenen moltes assignatures convalidades.
                </li>
              </ul>
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
</style>