<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import * as yup from 'yup'
import ModalComponent from '@/components/ModalComp.vue'
import ShowTable from '@/components/ShowTable.vue'

import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { api } from '@/repositories/api'
import { getObjectsIds } from '@/utils/utils'
import { useFormValidation } from '@/composables/useFormValidation'
// Store
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

const store = useDataStore()
const { pcc } = storeToRefs(store)


const { savePccMethodologicalPrinciple, deletePccMethodologicalPrinciple, addMessage } = store

// ==========================================
// 📊 ESTADO LOCAL
// ==========================================
const isDone = computed(() => {
  return Boolean(
    pcc.value.opportunitiesAndTechnologicalEvolution &&
    pcc.value.socioeconomicAndProfessionalEnvironment
  )
})
const pccMethodologicalPrinciples = computed(() => {
  if (!pcc.value.methodologicalsPrinciplesContext || !Array.isArray(pcc.value.methodologicalsPrinciplesContext)) {
    return []
  }
  return pcc.value.methodologicalsPrinciplesContext
    .map(mp => ({
      ...mp,
      mandatory: getObjectsIds(methodologicalPrinciples.value.mandatory).includes(mp.methodologicalPrinciple.id),
    }))
    || []
})
const pccMethodologicalPrinciplesColumns = [
  {
    title: 'Obl.',
    func: (x) => `<input type="checkbox" ${x ? 'checked' : ''} disabled>`,
    param: 'mandatory',
    html: true
  },
  {
    title: 'Nom',
    func: (x) => x?.name,
    param: 'methodologicalPrinciple'
  },
  {
    title: 'Mòduls',
    func: (modules) => modules.length === 0 ? 'Tots' : modules.map(m => m.code).join(', '),
    param: 'modules',
    html: false
  },
]

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
// 🎯 MODALES
// ==========================================
// Referencias a los modales
// - modal per a afegir principi metodològic
const addMpModalRef = ref(null)
// - modal per a editar principi metodològic
const editMpModalRef = ref(null)

// Mapa para acceso dinámico
const modalRefs = {
  mp: addMpModalRef,
  editMp: editMpModalRef,
}

// Configuración de modales
const modalsConfig = ref({
  mp: {
    modalId: 'mpModal',
    title: 'Afegir principi metodològic',
    size: 'lg',
    showSaveButton: false,
  },
  editMp: {
    modalId: 'editMpModal',
    title: 'Veure principi metodològic',
    size: 'lg',
    canEdit: false,
    showSaveButton: false,
  },
})
// Datos de modales
const modalFields = reactive({
  editMp: {},
})
// Estado para los módulos disponibles
const availableModules = computed(() => {
  return pcc.value.modules || []
})

// Estado para controlar si se aplica a todos o a módulos específicos
const applyToAllModules = ref(true)

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

// Guarda el principio metodológico seleccionado y abre el modal de edición
const openMP = (mode, mp) => {
  switch (mode) {
    case 'add':
      modalsConfig.value.editMp.title = `Afegir principi metodològic`
      modalsConfig.value.editMp.canEdit = true
      modalsConfig.value.editMp.showSaveButton = true
      break
    case 'edit':
      modalsConfig.value.editMp.title = `Editar principi metodològic`
      modalsConfig.value.editMp.canEdit = true
      modalsConfig.value.editMp.showSaveButton = true
      break
    case 'delete':
      modalsConfig.value.editMp.title = `Eliminar principi metodològic`
      modalsConfig.value.editMp.canEdit = false
      modalsConfig.value.editMp.showSaveButton = true
      modalsConfig.value.editMp.saveButtonText = 'Eliminar'
      modalsConfig.value.editMp.saveButtonClass = 'btn-danger'
      break
    default:
      modalsConfig.value.editMp.title = `Veure principi metodològic`
      modalsConfig.value.editMp.canEdit = false
      modalsConfig.value.editMp.showSaveButton = false
      break
  }
  modalFields.editMp = (mode === 'add')
    ? {
      methodologicalPrincipleId: mp.id,
      methodologicalPrincipleName: mp.name,
      contextDescription: '',
      moduleCodes: [],
    }
    : {
      methodologicalPrincipleId: mp.methodologicalPrinciple.id,
      methodologicalPrincipleName: mp.methodologicalPrinciple.name,
      contextDescription: mp.contextDescription,
      moduleCodes: mp.modules //.map(m => m.code),
    }
  modalFields.editMp._mode = mode
  // Determinar si se aplica a todos o a módulos específicos
  applyToAllModules.value = modalFields.editMp.moduleCodes.length === 0

  hideModal('mp')
  showModal('editMp')
}
const saveMpData = async () => {
  const isValid = await validateMp(modalFields.editMp)
  if (!isValid) return
  clearMpErrors()
  try {
    let response = {}
    if (modalFields.editMp._mode === 'delete') {
      response = await deletePccMethodologicalPrinciple(pcc.value.id, modalFields.editMp)
    } else {
      response = await savePccMethodologicalPrinciple(pcc.value.id, modalFields.editMp)
    }
    if (response === 'ok') {
      hideModal('editMp')
      clearMpErrors()
    } else {
      handleMpServerError(response)
    }
  } catch (error) {
    handleMpServerError(error)
  }
}

// ==========================================
// 📋 VALIDACIÓN
// ==========================================
const mpSchema = yup.object({
  methodologicalPrincipleId: yup
    .number()
    .required('Has de posar la contextualització de la programació'),
  contextDescription: yup
    .string()
    .trim()
    .required('Has de posar la contextualització del principi metodològic')
    .min(20, 'Al menys han de tindre 20 caràcters'),
  moduleCodes: yup
    .array()
    .of(yup.string())
    .test(
      'at-least-one-if-not-all',
      'Has de seleccionar almenys un mòdul o aplicar-lo a tots',
      function (value) {
        // Si applyToAllModules es true, no validamos
        // Si es false, debe haber al menos un módulo seleccionado
        if (!applyToAllModules.value) {
          return value && value.length > 0
        }
        return true
      }
    )
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

const methodologicalPrinciples = ref({
  mandatory: [],
  nonMandatory: []
})

const methodologicalPrinciplesFiltered = computed(() => {
  if (!pcc.value.methodologicalsPrinciplesContext) return methodologicalPrinciples.value
  const pccMPIds = pccMethodologicalPrinciples.value.map(mp => mp.methodologicalPrinciple.id)
  return {
    mandatory: methodologicalPrinciples.value.mandatory.filter(mp => !pccMPIds.includes(mp.id)),
    nonMandatory: methodologicalPrinciples.value.nonMandatory.filter(mp => !pccMPIds.includes(mp.id))
  }
})
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
    <ModalComponent ref="addMpModalRef" v-bind="modalsConfig.mp" @close="handleModalClose('mp')">
      <h4>Principis metodològics obligatoris</h4>
      <ShowTable :data="methodologicalPrinciplesFiltered.mandatory" :columns="methodologicalPrinciplesColumns">
        <template v-slot="{ item, index }">
          <button @click="openMP('add', item)" class="btn btn-secondary" title="Afegir">
            <i class="bi bi-plus"></i>
          </button>
        </template>
      </ShowTable>
      <h4>Altres principis metodològics que vaig a utilitzar</h4>
      <ShowTable :data="methodologicalPrinciplesFiltered.nonMandatory" :columns="methodologicalPrinciplesColumns">
        <template v-slot="{ item, index }">
          <button @click="openMP('add', item)" class="btn btn-secondary" title="Afegir">
            <i class="bi bi-plus"></i>
          </button>
        </template>
      </ShowTable>
    </ModalComponent>

    <ModalComponent ref="editMpModalRef" v-bind="modalsConfig.editMp" @close="handleModalClose('editMp')"
      @save="saveMpData">
      <form>
        <div class="mb-3">
          <label for="mpMethodologicalPrincipleId" class="form-label">Principi metodològic</label>
          <input type="text" class="form-control" id="mpMethodologicalPrincipleId"
            v-model="modalFields.editMp.methodologicalPrincipleName" disabled />
        </div>
        <div class="mb-3">
          <label for="mpContextDescription" class="form-label">Descripció del context d'aplicació del principi
            metodològic</label>
          <ckeditor v-if="modalsConfig.editMp.canEdit" :editor="editor" v-model="modalFields.editMp.contextDescription"
            :config="editorConfig" />
          <div v-else v-html="modalFields.editMp.contextDescription" class="border p-3 rounded bg-light"></div>
          <div v-if="mpErrors.contextDescription" class="text-danger mt-1">
            {{ mpErrors.contextDescription }}
          </div>
        </div>
        <!-- NUEVO: Selector de módulos -->
        <div class="mb-3">
          <label class="form-label">Aplicació del principi</label>

          <!-- Radio buttons para elegir todos o específicos -->
          <div class="form-check">
            <input class="form-check-input" type="radio" name="moduleSelection" id="allModules" :value="true"
              v-model="applyToAllModules" :disabled="!modalsConfig.editMp.canEdit">
            <label class="form-check-label" for="allModules">
              Aplicar a tots els mòduls del cicle
            </label>
          </div>

          <div class="form-check">
            <input class="form-check-input" type="radio" name="moduleSelection" id="specificModules" :value="false"
              v-model="applyToAllModules" :disabled="!modalsConfig.editMp.canEdit">
            <label class="form-check-label" for="specificModules">
              Aplicar només a mòduls específics
            </label>
          </div>

          <!-- Selector de módulos específicos (solo si no es "todos") -->
          <div v-if="!applyToAllModules" class="mt-3">
            <label class="form-label">Selecciona els mòduls</label>
            <div class="border rounded p-3" style="max-height: 200px; overflow-y: auto;">
              <div v-for="module in availableModules" :key="module.code" class="form-check">
                <input class="form-check-input" type="checkbox" :id="`module-${module.code}`" :value="module.code"
                  v-model="modalFields.editMp.moduleCodes" :disabled="!modalsConfig.editMp.canEdit">
                <label class="form-check-label" :for="`module-${module.code}`">
                  {{ module.code }} - {{ module.name }}
                </label>
              </div>
            </div>
            <div v-if="mpErrors.moduleCodes" class="text-danger mt-1">
              {{ mpErrors.moduleCodes }}
            </div>
            <small v-if="!modalsConfig.editMp.canEdit && modalFields.editMp.moduleCodes.length === 0"
              class="text-muted d-block mt-2">
              S'aplica a tots els mòduls del cicle
            </small>
          </div>
        </div>
      </form>
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
      <div class="alert alert-info mb-4">
        <i class="bi bi-info-circle-fill me-2"></i>
        <strong>S'han d'afegir TOTS els princicpis metodològics obligatoris i els que es considerin oportuns.</strong>
        <p v-if="methodologicalPrinciplesFiltered.mandatory.length > 0" class="mb-0 mt-2 text-danger">
          <i class="bi bi-exclamation-triangle-fill me-1"></i>
          <strong>Important:</strong> No s'han afegit tots els principis metodològics obligatoris
        </p>
      </div>

    <!-- 2.1 Enfocament -->
    <div class="card text-center mb-2">
      <div class="card-body">
        <ShowTable :data="pccMethodologicalPrinciples" :columns="pccMethodologicalPrinciplesColumns" :actions="true">

          <template v-slot="{ item, index }">
            <button @click="openMP('view', item)" class="btn btn-secondary" title="Veure">
              <i class="bi bi-eye"></i>
            </button>
            <button @click="openMP('edit', item)" class="btn btn-secondary" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button @click="openMP('delete', item)" class="btn btn-secondary" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </template>

        </ShowTable>

        <div class="card-footer text-muted">
          <button @click="showModal('mp')" class="btn btn-success" title="Afegir/Modificar principis metodològics">
            <i class="bi bi-pencil-fill me-2" />
            Afegir principi metodològic
          </button>
        </div>
      </div>

    </div>

    </div>
  </main>
</template>
