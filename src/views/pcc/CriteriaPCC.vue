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

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)
const { savePccSustainabilityCriteria, savePccComplementaryCriteria } = store

// Validación
const sustainabilitySchema = yup.object({
  sustainabilityCriteria: yup
    .string()
    .trim()
    .required('Has de posar els criteris d\'adaptació dels mòduls')
    .min(20, 'Al menys han de tindre 20 caràcters'),
})

const complementarySchema = yup.object({
  complementaryCriteria: yup
    .string()
    .trim()
    .required('Has de posar els criteris per a les activitats complementàries')
    .min(20, 'Al menys han de tindre 20 caràcters'),
})

const {
  errors: sustainabilityErrors,
  validate: validateSustainability,
  handleServerError: handleSustServerError,
  clearErrors: clearSustErrors,
} = useFormValidation(sustainabilitySchema)

const {
  errors: complementaryErrors,
  validate: validateComplementary,
  handleServerError: handleCompServerError,
  clearErrors: clearCompErrors,
} = useFormValidation(complementarySchema)

// Estado local
const modalFields = reactive({
  sustainabilityCriteria: '',
  complementaryCriteria: ''
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

// Computed
const isDone = computed(() => {
  return !!(pcc.value.criteriaAdaptingSostenibilityAndDigitalModules && pcc.value.criteriaForComplementaryAndExtraActivities)
})

// Lifecycle
onMounted(() => {
  modalFields.sustainabilityCriteria = pcc.value.criteriaAdaptingSostenibilityAndDigitalModules || ''
  modalFields.complementaryCriteria = pcc.value.criteriaForComplementaryAndExtraActivities || ''
})

// Modales
const sustainabilityModalRef = ref(null)
const complementaryModalRef = ref(null)

const modalRefs = {
  sustainability: sustainabilityModalRef,
  complementary: complementaryModalRef
}

const modalsConfig = {
  sustainability: {
    modalId: 'sustainabilityModal',
    title: 'Criteris d\'adaptació dels mòduls de Sostenibilitat i Digitalització',
    size: 'lg'
  },
  complementary: {
    modalId: 'complementaryModal',
    title: 'Criteris per a planificar les activitats complementàries i extraescolars',
    size: 'lg'
  }
}

const showModal = (key) => modalRefs[key].value?.show()
const hideModal = (key) => modalRefs[key].value?.hide()

const handleModalClose = (key) => {
  if (key === 'sustainability') clearSustErrors()
  if (key === 'complementary') clearCompErrors()
}

// Guardado
const saveSustainabilityData = async () => {
  const isValid = await validateSustainability({ sustainabilityCriteria: modalFields.sustainabilityCriteria })
  if (!isValid) return

  try {
    const response = await savePccSustainabilityCriteria(pcc.value.id, modalFields.sustainabilityCriteria)
    if (response === 'ok') {
      hideModal('sustainability')
      clearSustErrors()
    } else {
      handleSustServerError(response)
    }
  } catch (error) {
    handleSustServerError(error)
  }
}

const saveComplementaryData = async () => {
  const isValid = await validateComplementary({ complementaryCriteria: modalFields.complementaryCriteria })
  if (!isValid) return

  try {
    const response = await savePccComplementaryCriteria(pcc.value.id, modalFields.complementaryCriteria)
    if (response === 'ok') {
      hideModal('complementary')
      clearCompErrors()
    } else {
      handleCompServerError(response)
    }
  } catch (error) {
    handleCompServerError(error)
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <!-- Modal Sostenibilitat -->
    <ModalComponent ref="sustainabilityModalRef" v-bind="modalsConfig.sustainability"
      @save="saveSustainabilityData" @close="handleModalClose('sustainability')">
      <div class="row p-2 text-center">
        <ckeditor :editor="editor" v-model="modalFields.sustainabilityCriteria" :config="editorConfig" />
        <p v-if="sustainabilityErrors.sustainabilityCriteria" class="error mt-2">
          {{ sustainabilityErrors.sustainabilityCriteria }}
        </p>
      </div>
    </ModalComponent>

    <!-- Modal Complementàries -->
    <ModalComponent ref="complementaryModalRef" v-bind="modalsConfig.complementary"
      @save="saveComplementaryData" @close="handleModalClose('complementary')">
      <div class="row p-2 text-center">
        <ckeditor :editor="editor" v-model="modalFields.complementaryCriteria" :config="editorConfig" />
        <p v-if="complementaryErrors.complementaryCriteria" class="error mt-2">
          {{ complementaryErrors.complementaryCriteria }}
        </p>
      </div>
    </ModalComponent>

    <!-- Breadcrumb -->
    <AppBreadcrumb :actualStep="7" :done="isDone" />

    <!-- Header -->
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <!-- Contenido -->
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>7. Criteris d'adaptació i activitats</h2>

      <!-- 7.1 Sostenibilitat -->
      <div class="card text-center mb-2">
        <div class="card-header pcc fw-bold text-uppercase text-white text-start">
          7.1 Criteris d'adaptació dels mòduls de Sostenibilitat i Digitalització
        </div>
        <div class="card-body">
          <p v-if="pcc.criteriaAdaptingSostenibilityAndDigitalModules" class="text-start"
            v-html="pcc.criteriaAdaptingSostenibilityAndDigitalModules" />
          <p v-else>
            Has d'indicar els criteris d'adaptació dels mòduls de Sostenibilitat aplicable a l'entorn productiu i Digitalització aplicada al sistema productiu
          </p>
        </div>
        <div class="card-footer text-muted">
          <button @click="showModal('sustainability')" class="btn btn-success"
            title="Afegir/Modificar criteris d'adaptació">
            <i class="bi bi-pencil-fill me-2" />
            Afegir/Modificar criteris d'adaptació
          </button>
        </div>
      </div>

      <!-- 7.2 Activitats complementàries -->
      <div class="card text-center mb-2">
        <div class="card-header pcc fw-bold text-uppercase text-white text-start">
          7.2 Criteris per a planificar les activitats complementàries i extraescolars
        </div>
        <div class="card-body">
          <p v-if="pcc.criteriaForComplementaryAndExtraActivities" class="text-start"
            v-html="pcc.criteriaForComplementaryAndExtraActivities" />
          <p v-else>
            Has d'indicar els criteris per a la planificació de les activitats complementàries i extraescolars
          </p>
        </div>
        <div class="card-footer text-muted">
          <button @click="showModal('complementary')" class="btn btn-success"
            title="Afegir/Modificar criteris d'activitats complementàries">
            <i class="bi bi-pencil-fill me-2" />
            Afegir/Modificar criteris d'activitats
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.view-main {
  min-height: 100vh;
}

.error {
  color: #dc3545;
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
