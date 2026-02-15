<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import * as yup from 'yup'
import ModalComponent from '@/components/ModalComp.vue'

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
  if (
    !pcc.value.methodologicalsPrinciplesContext ||
    !Array.isArray(pcc.value.methodologicalsPrinciplesContext)
  ) {
    return []
  }
  return (
    pcc.value.methodologicalsPrinciplesContext.map((mp) => ({
      ...mp,
      mandatory: getObjectsIds(methodologicalPrinciples.value.mandatory).includes(
        mp.methodologicalPrinciple.id
      )
    })) || []
  )
})
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
// 🎯 MODALES
// ==========================================
// Referencias a los modales
// - modal per a gestionar principis metodològics
const addMpModalRef = ref(null)

// Mapa para acceso dinámico
const modalRefs = {
  mp: addMpModalRef
}

// Datos de modales
const modalFields = reactive({
  editMp: {
    methodologicalPrincipleId: null,
    methodologicalPrincipleName: '',
    contextDescription: '',
    moduleCodes: []
  }
})

const modalMode = ref('add')
const searchQuery = ref('')
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)
const hasSelection = computed(() => Boolean(modalFields.editMp.methodologicalPrincipleId))
const canEdit = computed(() => modalMode.value === 'add' || modalMode.value === 'edit')

const mpModalConfig = computed(() => {
  let title = 'Principis metodològics'
  if (modalMode.value === 'add') title = 'Afegir principi metodològic'
  if (modalMode.value === 'edit') title = 'Editar principi metodològic'
  if (modalMode.value === 'view') title = 'Veure principi metodològic'
  if (modalMode.value === 'delete') title = 'Eliminar principi metodològic'

  return {
    modalId: 'mpModal',
    title,
    size: 'lg',
    showSaveButton: modalMode.value !== 'view' && hasSelection.value,
    saveButtonText: modalMode.value === 'delete' ? 'Eliminar' : 'Guardar',
    saveButtonClass: modalMode.value === 'delete' ? 'btn-danger' : 'btn-success',
    saveDisabled: !hasSelection.value
  }
})
const selectedIsMandatory = computed(() => {
  if (!modalFields.editMp.methodologicalPrincipleId) return false
  return methodologicalPrinciples.value.mandatory.some(
    (mp) => mp.id === modalFields.editMp.methodologicalPrincipleId
  )
})

// Modal de ayuda (simple)
const showHelp = ref(false)
const activeHelpKey = ref('')
const helpContent = {
  methodology: {
    title: 'Ajuda - 2. Enfocaments didàctics i métodologics del Cicle',
    body: 'Cal indicar els principis metodològics que s’aplicaran en el cicle i descriure, per a cadascun, el context i la forma d’aplicació.\n\nEn els principis obligatoris, l’aplicació ha d’estar prevista en tots els mòduls del cicle.\n\nEn els principis no obligatoris, es poden aplicar a tot el cicle o bé seleccionar mòduls concrets. En aquest últim cas, el principi s’haurà d’implementar com a mínim en dos mòduls.\n\nA més d’indicar els mòduls, cal explicar com es desenvoluparà metodològicament (tipus d’activitats, organització de l’aula, productes finals, relació amb l’entorn, etc.).\n\n<div class="help-quote-label"><strong>Exemple</strong></div><blockquote class="help-quote"><strong>Aplicarem l’aprenentatge servei</strong> en els mòduls de Mòdul A i Mòdul B de primer curs, mitjançant projectes en què l’alumnat detectarà una necessitat del seu entorn i dissenyarà una intervenció que combine l’adquisició de competències professionals amb un servei real a la comunitat.</blockquote>'
  }
}

const activeHelp = computed(() => helpContent[activeHelpKey.value] || null)
const helpParagraphs = computed(() => {
  if (!activeHelp.value?.body) return []
  return activeHelp.value.body.split('\n\n').filter(Boolean)
})
// Estado para los módulos disponibles
const availableModules = computed(() => {
  return pcc.value.modules || []
})

const getPccMethodologicalPrinciple = (principleId) => {
  return pccMethodologicalPrinciples.value.find(
    (mp) => mp.methodologicalPrinciple.id === principleId
  )
}

const hasMethodologicalPrinciple = (principleId) => {
  return Boolean(getPccMethodologicalPrinciple(principleId))
}

const getMethodologicalPrincipleModules = (principleId) => {
  const principle = getPccMethodologicalPrinciple(principleId)
  return principle?.modules || []
}

const mandatoryAdded = computed(() => {
  return methodologicalPrinciples.value.mandatory.filter((principle) =>
    hasMethodologicalPrinciple(principle.id)
  )
})

const filterPendingByQuery = (principles) => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return principles
  return principles.filter((principle) => principle.name.toLowerCase().includes(query))
}

const mandatoryPending = computed(() => {
  return filterPendingByQuery(methodologicalPrinciples.value.mandatory).filter(
    (principle) => !hasMethodologicalPrinciple(principle.id)
  )
})

const nonMandatoryAdded = computed(() => {
  return methodologicalPrinciples.value.nonMandatory.filter((principle) =>
    hasMethodologicalPrinciple(principle.id)
  )
})

const nonMandatoryPending = computed(() => {
  return filterPendingByQuery(methodologicalPrinciples.value.nonMandatory).filter(
    (principle) => !hasMethodologicalPrinciple(principle.id)
  )
})

const openMethodologicalPrinciple = (principle) => {
  const added = getPccMethodologicalPrinciple(principle.id)
  if (added) {
    openMP('edit', added)
    return
  }
  openMP('add', principle)
}

const deleteMethodologicalPrinciple = (principleId) => {
  const added = getPccMethodologicalPrinciple(principleId)
  if (!added) return
  deleteTarget.value = added
  showDeleteConfirm.value = true
}

const deleteTargetName = computed(() => {
  return deleteTarget.value?.methodologicalPrinciple?.name || 'aquest principi'
})

const closeDeleteConfirm = () => {
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

const confirmDelete = async () => {
  if (!deleteTarget.value?.methodologicalPrinciple?.id) return
  const response = await deletePccMethodologicalPrinciple(pcc.value.id, {
    methodologicalPrincipleId: deleteTarget.value.methodologicalPrinciple.id
  })
  if (response === 'ok') {
    closeDeleteConfirm()
  }
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
  if (modalKey === 'mp') {
    clearMpErrors()
    resetMpForm()
  }
}

const resetMpForm = () => {
  modalMode.value = 'add'
  modalFields.editMp = {
    methodologicalPrincipleId: null,
    methodologicalPrincipleName: '',
    contextDescription: '',
    moduleCodes: []
  }
  applyToAllModules.value = true
}

watch(applyToAllModules, (value) => {
  if (value) {
    modalFields.editMp.moduleCodes = []
  }
})

watch(selectedIsMandatory, (value) => {
  if (value) {
    applyToAllModules.value = true
    modalFields.editMp.moduleCodes = []
  }
})

// Guarda el principio metodológico seleccionado y abre el modal
const openMP = (mode, mp) => {
  modalMode.value = mode
  modalFields.editMp =
    mode === 'add'
      ? {
          methodologicalPrincipleId: mp.id,
          methodologicalPrincipleName: mp.name,
          contextDescription: '',
          moduleCodes: []
        }
      : {
          methodologicalPrincipleId: mp.methodologicalPrinciple.id,
          methodologicalPrincipleName: mp.methodologicalPrinciple.name,
          contextDescription: mp.contextDescription,
          moduleCodes: (mp.modules || []).map((module) => module.code)
        }
  modalFields.editMp._mode = mode
  // Determinar si se aplica a todos o a módulos específicos
  applyToAllModules.value = modalFields.editMp.moduleCodes.length === 0

  showModal('mp')
}

const saveMpData = async () => {
  if (modalFields.editMp._mode !== 'delete') {
    const isValid = await validateMp(modalFields.editMp)
    if (!isValid) return
  }
  clearMpErrors()
  try {
    let response = {}
    if (modalFields.editMp._mode === 'delete') {
      response = await deletePccMethodologicalPrinciple(pcc.value.id, modalFields.editMp)
    } else {
      response = await savePccMethodologicalPrinciple(pcc.value.id, modalFields.editMp)
    }
    if (response === 'ok') {
      hideModal('mp')
      clearMpErrors()
      resetMpForm()
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
  clearErrors: clearMpErrors
} = mpValidation

const methodologicalPrinciples = ref({
  mandatory: [],
  nonMandatory: []
})

const methodologicalPrinciplesFiltered = computed(() => {
  if (!pcc.value.methodologicalsPrinciplesContext) return methodologicalPrinciples.value
  const pccMPIds = pccMethodologicalPrinciples.value.map((mp) => mp.methodologicalPrinciple.id)
  return {
    mandatory: methodologicalPrinciples.value.mandatory.filter((mp) => !pccMPIds.includes(mp.id)),
    nonMandatory: methodologicalPrinciples.value.nonMandatory.filter(
      (mp) => !pccMPIds.includes(mp.id)
    )
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
    <ModalComponent
      ref="addMpModalRef"
      v-bind="mpModalConfig"
      @close="handleModalClose('mp')"
      @save="saveMpData"
    >
      <form v-if="hasSelection">
        <div v-if="selectedIsMandatory" class="alert alert-danger mb-3">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>Principi obligatori</strong> pel Projecte Funcional del centre
        </div>
        <div v-if="modalMode === 'delete'" class="alert alert-danger">
          Estàs a punt d'eliminar aquest principi del PCC.
        </div>
        <div class="mb-3">
          <label for="mpMethodologicalPrincipleId" class="form-label">Principi metodològic</label>
          <input
            type="text"
            class="form-control"
            id="mpMethodologicalPrincipleId"
            v-model="modalFields.editMp.methodologicalPrincipleName"
            disabled
          />
        </div>
        <div class="mb-3">
          <label for="mpContextDescription" class="form-label"
            >Descripció del context d'aplicació del principi metodològic</label
          >
          <div class="alert alert-info py-2">
            <i class="bi bi-info-circle-fill me-2"></i>
            La descripció ha de concretar la tipología d’activitats o projectes en que s'aplicará,
            les situacions reals o simulades en què es treballarà, la possible relació amb l’entorn.
            No és suficient dir que s’aplicarà; cal explicar com es materialitza.
          </div>
          <ckeditor
            v-if="canEdit"
            :editor="editor"
            v-model="modalFields.editMp.contextDescription"
            :config="editorConfig"
          />
          <div
            v-else
            v-html="modalFields.editMp.contextDescription"
            class="border p-3 rounded bg-light"
          ></div>
          <div v-if="mpErrors.contextDescription" class="text-danger mt-1">
            {{ mpErrors.contextDescription }}
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">Aplicació del principi</label>

          <div v-if="selectedIsMandatory" class="alert alert-info">
            Aquest principi és obligatori i s'aplica a tots els mòduls del cicle.
          </div>

          <template v-else>
            <div class="form-check">
              <input
                class="form-check-input"
                type="radio"
                name="moduleSelection"
                id="allModules"
                :value="true"
                v-model="applyToAllModules"
                :disabled="!canEdit"
              />
              <label class="form-check-label" for="allModules">
                Aplicar a tots els mòduls del cicle
              </label>
            </div>

            <div class="form-check">
              <input
                class="form-check-input"
                type="radio"
                name="moduleSelection"
                id="specificModules"
                :value="false"
                v-model="applyToAllModules"
                :disabled="!canEdit"
              />
              <label class="form-check-label" for="specificModules">
                Aplicar només a mòduls específics
              </label>
            </div>

            <div v-if="!applyToAllModules" class="mt-3">
              <label class="form-label">Selecciona els mòduls</label>
              <div class="border rounded p-3" style="max-height: 200px; overflow-y: auto">
                <div v-for="module in availableModules" :key="module.code" class="form-check">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    :id="`module-${module.code}`"
                    :value="module.code"
                    v-model="modalFields.editMp.moduleCodes"
                    :disabled="!canEdit"
                  />
                  <label class="form-check-label" :for="`module-${module.code}`">
                    {{ module.code }} - {{ module.name }}
                  </label>
                </div>
              </div>
              <div v-if="mpErrors.moduleCodes" class="text-danger mt-1">
                {{ mpErrors.moduleCodes }}
              </div>
              <small
                v-if="!canEdit && modalFields.editMp.moduleCodes.length === 0"
                class="text-muted d-block mt-2"
              >
                S'aplica a tots els mòduls del cicle
              </small>
            </div>
          </template>
        </div>
      </form>
      <div v-else class="alert alert-secondary mb-0">
        Selecciona un principi per a configurar-lo.
      </div>
    </ModalComponent>

    <!-- ✅ BREADCRUMB -->
    <AppBreadcrumb :actualStep="2" :done="isDone" />

    <!-- ✅ HEADER -->
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <!-- ✅ CONTENIDO PRINCIPAL -->
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>
        2. Enfocaments didàctics i métodologics del Cicle
        <span
          @click="toggleHelp('methodology')"
          class="cursor-pointer ms-2 help-icon"
          role="button"
          tabindex="0"
        >
          <i class="bi bi-info-circle-fill text-info" />
        </span>
      </h2>
      <div class="card mb-2">
        <div class="card-header pcc text-white fw-bold">Principis afegits</div>
        <div class="card-header bg-success text-white fw-bold">
          <i class="bi bi-check-circle-fill me-2"></i>
          Obligatoris ({{ mandatoryAdded.length }})
        </div>
        <ul class="list-group list-group-flush principles-list">
          <li v-if="mandatoryAdded.length === 0" class="list-group-item text-muted">
            Encara no hi ha obligatoris afegits
          </li>
          <li v-for="principle in mandatoryAdded" :key="principle.id" class="list-group-item">
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <i class="bi bi-check-circle-fill text-success" title="Afegit"></i>
                  <strong>{{ principle.name }}</strong>
                  <span class="badge bg-danger">Obligatori</span>
                  <span class="badge bg-success">Afegit</span>
                </div>
                <div class="mt-2">
                  <span
                    v-if="getMethodologicalPrincipleModules(principle.id).length === 0"
                    class="text-muted small"
                  >
                    Aplica a tots els mòduls
                  </span>
                  <div v-else class="d-flex flex-wrap gap-1">
                    <span
                      v-for="module in getMethodologicalPrincipleModules(principle.id)"
                      :key="module.code"
                      class="badge bg-light text-dark border"
                      :title="module.name"
                    >
                      {{ module.code }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="btn-group-vertical" role="group">
                <button
                  @click="openMethodologicalPrinciple(principle)"
                  class="btn btn-sm btn-outline-primary"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  @click="deleteMethodologicalPrinciple(principle.id)"
                  class="btn btn-sm btn-outline-danger"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </li>
        </ul>
        <div class="card-header bg-success text-white fw-bold">
          <i class="bi bi-check-circle-fill me-2"></i>
          No obligatoris ({{ nonMandatoryAdded.length }})
        </div>
        <ul class="list-group list-group-flush principles-list">
          <li v-if="nonMandatoryAdded.length === 0" class="list-group-item text-muted">
            Encara no hi ha principis afegits
          </li>
          <li v-for="principle in nonMandatoryAdded" :key="principle.id" class="list-group-item">
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <i class="bi bi-check-circle-fill text-success" title="Afegit"></i>
                  <strong>{{ principle.name }}</strong>
                  <span class="badge bg-success">Afegit</span>
                </div>
                <div class="mt-2">
                  <span
                    v-if="getMethodologicalPrincipleModules(principle.id).length === 0"
                    class="text-muted small"
                  >
                    Aplica a tots els mòduls
                  </span>
                  <div v-else class="d-flex flex-wrap gap-1">
                    <span
                      v-for="module in getMethodologicalPrincipleModules(principle.id)"
                      :key="module.code"
                      class="badge bg-light text-dark border"
                      :title="module.name"
                    >
                      {{ module.code }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="btn-group-vertical" role="group">
                <button
                  @click="openMethodologicalPrinciple(principle)"
                  class="btn btn-sm btn-outline-primary"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  @click="deleteMethodologicalPrinciple(principle.id)"
                  class="btn btn-sm btn-outline-danger"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <div class="card mb-3 pending-card">
        <div class="card-header fw-bold text-center">Disponibles per a Afegir</div>
        <div class="card-body">
          <label for="principlesSearch" class="form-label fw-bold">Cercar principis</label>
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input
              id="principlesSearch"
              v-model.trim="searchQuery"
              type="text"
              class="form-control"
              placeholder="Escriu el nom del principi"
            />
          </div>
          <div v-if="searchQuery" class="form-text">Mostrant resultats per "{{ searchQuery }}"</div>
        </div>
        <div class="card-header bg-warning text-dark fw-bold">
          <i class="bi bi-exclamation-circle me-2"></i>
          Obligatoris ({{ mandatoryPending.length }})
        </div>
        <ul class="list-group list-group-flush principles-list">
          <li v-if="mandatoryPending.length === 0" class="list-group-item text-success">
            Tots els obligatoris estan afegits
          </li>
          <li v-for="principle in mandatoryPending" :key="principle.id" class="list-group-item">
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-exclamation-circle-fill text-warning" title="Pendent"></i>
                  <strong>{{ principle.name }}</strong>
                  <span class="badge bg-danger">Obligatori</span>
                </div>
              </div>
              <div class="btn-group-vertical" role="group">
                <button
                  @click="openMethodologicalPrinciple(principle)"
                  class="btn btn-sm btn-primary"
                >
                  <i class="bi bi-plus-circle"></i>
                </button>
              </div>
            </div>
          </li>
        </ul>
        <div class="card-header bg-warning text-dark fw-bold">
          <i class="bi bi-circle me-2"></i>
          No obligatoris ({{ nonMandatoryPending.length }})
        </div>
        <ul class="list-group list-group-flush principles-list">
          <li v-if="nonMandatoryPending.length === 0" class="list-group-item text-muted">
            No hi ha principis pendents
          </li>
          <li v-for="principle in nonMandatoryPending" :key="principle.id" class="list-group-item">
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-circle text-secondary" title="No afegit"></i>
                  <strong>{{ principle.name }}</strong>
                </div>
              </div>
              <div class="btn-group-vertical" role="group">
                <button
                  @click="openMethodologicalPrinciple(principle)"
                  class="btn btn-sm btn-primary"
                >
                  <i class="bi bi-plus-circle"></i>
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </main>

  <!-- ✅ MODAL DE CONFIRMACIÓ ELIMINAR -->
  <Teleport to="body">
    <div v-if="showDeleteConfirm">
      <div class="modal d-block" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title mx-auto">
                <i class="bi bi-exclamation-triangle-fill me-2" />
                Confirmar eliminació
              </h5>
            </div>
            <div class="modal-body">
              <p class="mb-0">
                Vols eliminar l'aplicació del principi metodològic
                <strong>"{{ deleteTargetName }}"</strong> del PCC?
              </p>
            </div>
            <div class="modal-footer mx-auto">
              <button type="button" class="btn btn-secondary" @click="closeDeleteConfirm">
                Cancel·lar
              </button>
              <button type="button" class="btn btn-danger" @click="confirmDelete">Eliminar</button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="closeDeleteConfirm" />
    </div>
  </Teleport>

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
              <button type="button" class="btn btn-info btn-lg help-close-btn" @click="closeHelp">
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
.principles-list {
  max-height: 320px;
  overflow-y: auto;
}

.pending-card {
  width: calc(100% - 4px);
  margin: 0 auto;
  padding: 0.25rem;
  background-color: rgba(33, 37, 41, 0.05);
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

.help-close-btn {
  font-size: 1rem;
}
</style>
