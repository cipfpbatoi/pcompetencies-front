<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import * as yup from 'yup'
import ModalComponent from '@/components/ModalComp.vue'
import ShowTable from '@/components/ShowTable.vue'

import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { api } from '@/repositories/api'
import { makeCheckeableArray, getObjectsIds } from '@/utils/utils.js'

import { useFormValidation } from '@/composables/useFormValidation'
// Store
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

const store = useDataStore()
const { pcc } = storeToRefs(store)
const { savePCCMethodologicalPrinciples, addMessage } = store

// ==========================================
// 📊 ESTADO LOCAL
// ==========================================
const modalFields = reactive({
  focus: '',
})
const isDone = computed(() => {
  return Boolean(
    pcc.value.opportunitiesAndTechnologicalEvolution &&
    pcc.value.socioeconomicAndProfessionalEnvironment
  )
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
// 🎯 MODALES - Sistema agrupado
// ==========================================

// Referencias a los modales
const pccMpModalRef = ref(null)

// Mapa para acceso dinámico
const modalRefs = {
  mp: pccMpModalRef,
}

// Información de configuración de modales
const modalsConfig = {
  mp: {
    modalId: 'mpModal',
    title: 'Modificar els principis metodològics',
    size: 'lg'
  }
}

// Métodos genéricos para manejar modales
const showModal = (modalKey) => {
  modalRefs[modalKey].value?.show()
}

const hideModal = (modalKey) => {
  modalRefs[modalKey].value?.hide()
}

const handleModalClose = (modalKey) => {
  if (modalKey === 'mp') clearMpErrors()
}

// Guarda enfoque
const saveMpData = async () => {
  const isValid = await validateMp({ mp: modalFields.mp })
  if (!isValid) return
  const principlesChecked = this.methodologicalPrinciplesCheckeables.filter(
    (item) => item.checked
  )

  try {
    const response = await savePCCMethodologicalPrinciples(pcc.value.id, {
      methodologicalPrinciples: getObjectsIds(principlesChecked)
    })
    if (response === 'ok') {
      hideModal('mp')
      clearMpErrors()
      addMessage('success', 'Principis metodològics guardats')

    } else {
      handleMpServerError(response)
    }
  } catch (error) {
    console.error('Error al guardar contexto:', error)
    handleMpServerError(error)
  }
}

// ==========================================
// 📋 VALIDACIÓN
// ==========================================
const mpSchema = yup.object({
  mp: yup
    .string()
    .trim()
    .required('Has de posar la contextualització de la programació')
    .min(20, 'Al menys han de tindre 20 caràcters'),
})


const mpValidation = useFormValidation(mpSchema)
const {
  errors: mpErrors,
  validate: validateMp,
  handleServerError: handleMpServerError,
  clearErrors: clearMpErrors,
} = mpValidation

// ==========================================
// 📋 METODOLOGICAL PRINCPIPLE CONTEXT
// ==========================================
const methodologicalPrinciplesColumns = [
  {
    title: 'Nom',
    value: 'name'
  },
  {
    title: 'Descripció',
    value: 'description'
  }
]
const methodologicalPrinciplesMandatoryColumns = computed(() => {
  return [
    {
      title: 'Sel.',
      func: () => '<input type="checkbox" checked disabled>',
      param: 'code',
      html: true
    },
    ...methodologicalPrinciplesColumns
  ]
})
const methodologicalPrinciples = ref([])
const methodologicalPrinciplesCheckeables = computed(() => makeCheckeableArray(
  methodologicalPrinciples.value.nonMandatory,
  pcc.methodologicalsPrinciplesContext
))
onMounted(async () => {
  try {
    const response = await api.getMethodologicalPrinciples()
    methodologicalPrinciples.value = response.data

  } catch (error) {
    addMessage('Error al carregar els principis metodològics', 'error')
  }
})

</script>

<template>
  <main class="border shadow view-main">
    <!-- ✅ MODAL MP -->
    <ModalComponent ref="pccMpModalRef" v-bind="modalsConfig.mp" @save="saveMpData" @close="handleModalClose('mp')">
      <h4>Principis metodològics obligatoris</h4>
      <ShowTable :data="methodologicalPrinciples.mandatory" :columns="methodologicalPrinciplesMandatoryColumns"
        :actions="false">
      </ShowTable>
      <h4>Altres principis metodològics que vaig a utilitzar</h4>
      <ShowTable :checkeable="true" :data="methodologicalPrinciplesCheckeables"
        :columns="methodologicalPrinciplesColumns" :actions="false">
      </ShowTable>
    </ModalComponent>

    <!-- ✅ BREADCRUMB -->
    <AppBreadcrumb :actualStep="2" :done="isDone" />

    <!-- ✅ HEADER -->
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <!-- ✅ CONTENIDO PRINCIPAL -->
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>2. Enfocament</h2>

      <!-- 1.1 Entorn -->
      <div class="card text-center mb-2">
        <div class="card-header pcc fw-bold text-uppercase text-white text-start">
          2 Enfocament metodològic i estratègies d'ensenyament-aprenentatge
        </div>
        <div class="card-body">
          <p v-if="pcc.socioeconomicAndProfessionalEnvironment" class="text-start"
            v-html="pcc.socioeconomicAndProfessionalEnvironment" />
          <p v-else>
            Has d'indicar l'entorn del cicle a Alcoi i comarca
          </p>
        </div>
        <div class="card-footer text-muted">
          <button @click="showModal('mp')" class="btn btn-success" title="Afegir/Modificar principis metodològics">
            <i class="bi bi-pencil-fill me-2" />
            Afegir/Modificar principis metodològics
          </button>
        </div>
      </div>

    </div>
  </main>
</template>
