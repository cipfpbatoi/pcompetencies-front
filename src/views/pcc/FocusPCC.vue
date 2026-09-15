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

const TURN_OPTIONS = [
  { value: 'presential', label: 'Presencial' },
  { value: 'half-presential', label: 'Semi-presencial' }
]

const DEFAULT_TURN = 'presential'

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
    methodologicalPrincipleDescription: '',
    contextDescription: '',
    turns: [],
    moduleTurnSelections: []
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
  if (modalMode.value === 'add') {
    title = selectedCategoryLabel.value
      ? `Afegir ${selectedCategoryLabel.value}`
      : 'Afegir principi metodològic'
  }
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
    body: 'Cal indicar els principis metodològics que s’aplicaran en el cicle i descriure, per a cadascun, el context i la forma d’aplicació.\n\nEn els principis obligatoris, l’aplicació ha d’estar prevista en tots els mòduls del cicle.\n\nEn els principis no obligatoris, es poden aplicar a tot el cicle o bé seleccionar mòduls concrets. En aquest últim cas, el principi s’haurà d’implementar com a mínim en dos mòduls.\n\nA més d’indicar els mòduls, cal explicar com es desenvoluparà metodològicament (tipus d’activitats, organització de l’aula, productes finals, relació amb l’entorn, etc.).\n\n<div class="help-quote-label"><strong>Exemple</strong></div><blockquote class="help-quote"><strong>Aplicarem l’aprenentatge servei</strong> mitjançant projectes en què l’alumnat detectarà una necessitat del seu entorn i dissenyarà una intervenció que combine l’adquisició de competències professionals amb un servei real a la comunitat.</blockquote>'
  }
}

const activeHelp = computed(() => helpContent[activeHelpKey.value] || null)
const helpParagraphs = computed(() => {
  if (!activeHelp.value?.body) return []
  return activeHelp.value.body.split('\n\n').filter(Boolean)
})
// Estado para los módulos disponibles
const availableModules = computed(() => {
  const moduleMap = new Map()
  ;(pcc.value.modules || []).forEach((module) => {
    if (!module?.code) return
    moduleMap.set(module.code, {
      code: module.code,
      name: module.name || module.code
    })
  })

  return Array.from(moduleMap.values()).sort((a, b) => a.code.localeCompare(b.code))
})

const availableTurns = computed(() => {
  const cycleAvailableTurns = Array.isArray(pcc.value?.cycle?.availableTurns)
    ? pcc.value.cycle.availableTurns
    : []

  const normalizedTurns = [...new Set(cycleAvailableTurns)].filter((turn) =>
    TURN_OPTIONS.some((option) => option.value === turn)
  )

  if (normalizedTurns.length > 0) return normalizedTurns
  return [DEFAULT_TURN]
})

const availableTurnOptions = computed(() => {
  return TURN_OPTIONS.filter((option) => availableTurns.value.includes(option.value))
})

const hasMultipleTurns = computed(() => availableTurns.value.length > 1)

const getPccMethodologicalPrinciple = (principleId) => {
  return pccMethodologicalPrinciples.value.find(
    (mp) => mp.methodologicalPrinciple.id === principleId
  )
}

const hasMethodologicalPrinciple = (principleId) => {
  return Boolean(getPccMethodologicalPrinciple(principleId))
}

const getPrincipleCategory = (principle) => {
  const translations = {
    principle: 'Principi Metodològic',
    focus: 'Enfocament',
    methodology: 'Metodología'
  }
  if (principle?.category) return translations[principle.category] || principle.category
  const added = getPccMethodologicalPrinciple(principle?.id)
  const category = added?.methodologicalPrinciple?.category
  return translations[category] || category || ''
}

const selectedPrinciple = computed(() => {
  const principleId = modalFields.editMp.methodologicalPrincipleId
  if (!principleId) return null
  const allPrinciples = [
    ...methodologicalPrinciples.value.mandatory,
    ...methodologicalPrinciples.value.nonMandatory
  ]
  const found = allPrinciples.find((principle) => principle.id === principleId)
  if (found) return found
  const added = getPccMethodologicalPrinciple(principleId)
  return added?.methodologicalPrinciple || null
})

const selectedCategoryLabel = computed(() => {
  if (!selectedPrinciple.value) return ''
  return getPrincipleCategory(selectedPrinciple.value)
})

const isMethodologyCategory = (category) => category === 'methodology'

const getCategoryBadgeClass = (category) => {
  switch (category) {
    case 'principle':
      return 'bg-primary'
    case 'focus':
      return 'bg-warning text-dark'
    case 'methodology':
      return 'bg-success'
    default:
      return 'bg-info text-dark'
  }
}

const normalizeModuleTurnSelections = (selections) => {
  if (!Array.isArray(selections)) return []
  return selections
    .map((selection) => ({
      moduleCode: selection?.moduleCode || selection?.module?.code || '',
      turn: selection?.turn || ''
    }))
    .filter((selection) => selection.moduleCode)
}

const getTurnLabel = (turn) => {
  return TURN_OPTIONS.find((option) => option.value === turn)?.label || turn
}

const getTurnShortLabel = (turn) => {
  if (turn === 'presential') return 'PRES.'
  if (turn === 'half-presential') return 'SEMI.'
  return turn
}

const getMethodologicalPrincipleData = (principleId) => {
  return getPccMethodologicalPrinciple(principleId) || {}
}

const buildModuleSummary = (principleId) => {
  const principleData = getMethodologicalPrincipleData(principleId)
  const selections = normalizeModuleTurnSelections(principleData.moduleTurnSelections)

  if (!selections.length) {
    const legacyModules = Array.isArray(principleData.modules)
      ? principleData.modules.map((module) => module?.code).filter(Boolean)
      : []

    if (legacyModules.length > 0) return legacyModules.sort().join(', ')
    return 'Tots els mòduls'
  }

  if (!hasMultipleTurns.value) {
    const uniqueModules = [...new Set(selections.map((selection) => selection.moduleCode))]
    return uniqueModules.sort().join(', ')
  }

  const groupedByTurn = selections.reduce((acc, selection) => {
    const turnKey = selection.turn || 'without-turn'
    if (!acc[turnKey]) acc[turnKey] = new Set()
    acc[turnKey].add(selection.moduleCode)
    return acc
  }, {})

  return Object.entries(groupedByTurn)
    .map(([turn, modules]) => {
      if (turn === 'without-turn') return Array.from(modules).sort().join(', ')
      return `${getTurnShortLabel(turn)}: ${Array.from(modules).sort().join(', ')}`
    })
    .join(' | ')
}

const buildTurnSummary = (principleId) => {
  const principleData = getMethodologicalPrincipleData(principleId)
  const turns = Array.isArray(principleData.turns) ? principleData.turns : []
  if (!turns.length) return 'Tots els règims'
  return turns.map((turn) => getTurnLabel(turn)).join(', ')
}

const shouldShowTurnSummary = (principleId) => {
  if (!hasMultipleTurns.value) return false
  const principleData = getMethodologicalPrincipleData(principleId)
  const selections = normalizeModuleTurnSelections(principleData.moduleTurnSelections)
  return selections.length === 0
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

const isMandatoryPrinciple = (principleId) => {
  return methodologicalPrinciples.value.mandatory.some((principle) => principle.id === principleId)
}

const combinedAdded = computed(() => {
  return [...mandatoryAdded.value, ...nonMandatoryAdded.value]
})

const combinedPending = computed(() => {
  return [...mandatoryPending.value, ...nonMandatoryPending.value]
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

// Estado para controlar si se aplica a todos o a módulos/turnos específicos
const applyToAllModules = ref(true)
const applyToAllTurns = ref(true)

const effectiveTurns = computed(() => {
  if (!applyToAllModules.value) return availableTurns.value
  if (!hasMultipleTurns.value) return availableTurns.value
  if (applyToAllTurns.value) return availableTurns.value
  return modalFields.editMp.turns.filter((turn) => availableTurns.value.includes(turn))
})

const effectiveTurnOptions = computed(() => {
  return TURN_OPTIONS.filter((option) => effectiveTurns.value.includes(option.value))
})

const isTurnOptionDisabled = (turnValue) => {
  if (modalFields.editMp.turns.includes(turnValue)) return false
  return modalFields.editMp.turns.length >= availableTurnOptions.value.length - 1
}

const hasModuleTurnSelection = (moduleCode, turn) => {
  return modalFields.editMp.moduleTurnSelections.some(
    (selection) => selection.moduleCode === moduleCode && selection.turn === turn
  )
}

const toggleModuleTurnSelection = (moduleCode, turn) => {
  const index = modalFields.editMp.moduleTurnSelections.findIndex(
    (selection) => selection.moduleCode === moduleCode && selection.turn === turn
  )

  if (index > -1) {
    modalFields.editMp.moduleTurnSelections.splice(index, 1)
    return
  }

  modalFields.editMp.moduleTurnSelections.push({ moduleCode, turn })
}

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
    methodologicalPrincipleDescription: '',
    contextDescription: '',
    turns: [],
    moduleTurnSelections: []
  }
  applyToAllTurns.value = true
  applyToAllModules.value = true
}

watch(applyToAllTurns, (value) => {
  if (value) {
    modalFields.editMp.turns = []
  }
})

watch(hasMultipleTurns, (value) => {
  if (value) return
  applyToAllTurns.value = true
  modalFields.editMp.turns = []
})

watch(applyToAllModules, (value) => {
  if (value) {
    modalFields.editMp.moduleTurnSelections = []
    return
  }

  applyToAllTurns.value = true
  modalFields.editMp.turns = []
})

watch(selectedIsMandatory, (value) => {
  if (value) {
    applyToAllTurns.value = true
    applyToAllModules.value = true
    modalFields.editMp.turns = []
    modalFields.editMp.moduleTurnSelections = []
  }
})

watch(
  [effectiveTurns, availableModules],
  ([nextTurns, nextModules]) => {
    const validModules = new Set(nextModules.map((module) => module.code))
    modalFields.editMp.moduleTurnSelections = modalFields.editMp.moduleTurnSelections.filter(
      (selection) =>
        validModules.has(selection.moduleCode) &&
        selection.turn &&
        nextTurns.includes(selection.turn)
    )
  },
  { deep: true }
)

// Guarda el principio metodológico seleccionado y abre el modal
const openMP = (mode, mp) => {
  modalMode.value = mode
  const principleDescription =
    mode === 'add' ? mp?.description || '' : mp?.methodologicalPrinciple?.description || ''
  const defaultContextDescription =
    !isMethodologyCategory(mp?.category) && mp?.description ? mp.description : ''
  modalFields.editMp =
    mode === 'add'
      ? {
          methodologicalPrincipleId: mp.id,
          methodologicalPrincipleName: mp.name,
          methodologicalPrincipleDescription: principleDescription,
          contextDescription: defaultContextDescription,
          turns: [],
          moduleTurnSelections: []
        }
      : {
          methodologicalPrincipleId: mp.methodologicalPrinciple.id,
          methodologicalPrincipleName: mp.methodologicalPrinciple.name,
          methodologicalPrincipleDescription: principleDescription,
          contextDescription:
            mp.contextDescription ||
            (!isMethodologyCategory(mp.methodologicalPrinciple?.category) &&
            mp.methodologicalPrinciple?.description
              ? mp.methodologicalPrinciple.description
              : ''),
          turns: (Array.isArray(mp.turns) ? mp.turns : []).filter((turn) =>
            availableTurns.value.includes(turn)
          ),
          moduleTurnSelections: normalizeModuleTurnSelections(mp.moduleTurnSelections).filter(
            (selection) => availableTurns.value.includes(selection.turn)
          )
        }
  modalFields.editMp._mode = mode

  if (hasMultipleTurns.value && modalFields.editMp.turns.length >= availableTurns.value.length) {
    modalFields.editMp.turns = []
  }

  if (!hasMultipleTurns.value) {
    modalFields.editMp.turns = []
  }

  if (
    mode !== 'add' &&
    modalFields.editMp.moduleTurnSelections.length === 0 &&
    Array.isArray(mp.modules) &&
    mp.modules.length > 0
  ) {
    const fallbackTurn = availableTurns.value[0] || DEFAULT_TURN
    modalFields.editMp.moduleTurnSelections = mp.modules
      .map((module) => module?.code)
      .filter(Boolean)
      .map((moduleCode) => ({ moduleCode, turn: fallbackTurn }))
  }

  applyToAllModules.value =
    selectedIsMandatory.value || modalFields.editMp.moduleTurnSelections.length === 0
  applyToAllTurns.value =
    selectedIsMandatory.value || !hasMultipleTurns.value || modalFields.editMp.turns.length === 0

  if (!applyToAllModules.value) {
    applyToAllTurns.value = true
    modalFields.editMp.turns = []
  }

  showModal('mp')
}

const saveMpData = async () => {
  const payload = {
    methodologicalPrincipleId: modalFields.editMp.methodologicalPrincipleId,
    contextDescription: modalFields.editMp.contextDescription,
    turns:
      selectedIsMandatory.value ||
      !hasMultipleTurns.value ||
      !applyToAllModules.value ||
      applyToAllTurns.value
        ? []
        : modalFields.editMp.turns,
    moduleTurnSelections:
      selectedIsMandatory.value || applyToAllModules.value
        ? []
        : modalFields.editMp.moduleTurnSelections.map((selection) => ({
            moduleCode: selection.moduleCode,
            turn: selection.turn
          }))
  }

  if (modalFields.editMp._mode !== 'delete') {
    const isValid = await validateMp(payload)
    if (!isValid) return
  }
  clearMpErrors()
  try {
    let response = {}
    if (modalFields.editMp._mode === 'delete') {
      response = await deletePccMethodologicalPrinciple(pcc.value.id, modalFields.editMp)
    } else {
      response = await savePccMethodologicalPrinciple(pcc.value.id, payload)
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
  turns: yup
    .array()
    .of(yup.string())
    .test(
      'valid-turns',
      'Hi ha règims seleccionats que no estan disponibles en aquest cicle',
      function (value) {
        if (!hasMultipleTurns.value || !applyToAllModules.value || applyToAllTurns.value) {
          return true
        }

        return Array.isArray(value) && value.every((turn) => availableTurns.value.includes(turn))
      }
    )
    .test('required-turns', 'Has de seleccionar almenys un règim', function (value) {
      if (!hasMultipleTurns.value || !applyToAllModules.value || applyToAllTurns.value) {
        return true
      }

      return Array.isArray(value) && value.length > 0
    })
    .test(
      'not-all-turns',
      'Si apliques a tots els règims, usa l\'opció "Tots els règims"',
      function (value) {
        if (!hasMultipleTurns.value || !applyToAllModules.value || applyToAllTurns.value) {
          return true
        }

        return Array.isArray(value) && value.length < availableTurns.value.length
      }
    ),
  moduleTurnSelections: yup
    .array()
    .of(
      yup.object({
        moduleCode: yup.string().required(),
        turn: yup.string().required()
      })
    )
    .test('required-selections', 'Afig almenys una combinació de mòdul i règim', function (value) {
      if (applyToAllModules.value) return true
      return Array.isArray(value) && value.length > 0
    })
    .test('valid-selections', 'Hi ha combinacions de mòdul+règim no vàlides', function (value) {
      if (applyToAllModules.value) return true
      if (!Array.isArray(value)) return false

      const validModules = new Set(availableModules.value.map((module) => module.code))
      return value.every(
        (selection) =>
          validModules.has(selection.moduleCode) && effectiveTurns.value.includes(selection.turn)
      )
    })
    .test('unique-selections', 'No es poden repetir combinacions mòdul+règim', function (value) {
      if (applyToAllModules.value) return true
      if (!Array.isArray(value)) return false

      const uniquePairs = new Set(
        value.map((selection) => `${selection.moduleCode}::${selection.turn}`)
      )
      return uniquePairs.size === value.length
    })
    .test(
      'at-least-two-modules',
      'Has de seleccionar almenys 2 mòduls diferents',
      function (value) {
        if (applyToAllModules.value) return true
        if (!Array.isArray(value) || value.length === 0) return false

        const uniqueModules = new Set(value.map((selection) => selection.moduleCode))
        return uniqueModules.size >= 2
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
        <div v-if="modalMode === 'add' && selectedCategoryLabel" class="alert alert-info mb-3">
          <i class="bi bi-plus-circle-fill me-2"></i>
          Afegir "{{ selectedCategoryLabel }}"
        </div>
        <div v-if="selectedIsMandatory" class="alert alert-danger mb-3">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>Principi obligatori</strong> pel Projecte Funcional del centre
        </div>
        <div v-if="modalMode === 'delete'" class="alert alert-danger">
          Estàs a punt d'eliminar aquest principi del PCC.
        </div>
        <div class="mb-3">
          <label for="mpMethodologicalPrincipleId" class="form-label">
            {{ selectedCategoryLabel || 'Principi metodològic' }}
          </label>
          <input
            type="text"
            class="form-control"
            id="mpMethodologicalPrincipleId"
            v-model="modalFields.editMp.methodologicalPrincipleName"
            disabled
          />
          <div class="principle-description mt-2">
            {{
              modalFields.editMp.methodologicalPrincipleDescription ||
              'Sense descripció disponible per a aquest principi.'
            }}
          </div>
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
            Principi obligatori per a tots els mòduls i règims.
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
              <label class="form-check-label" for="allModules"> Tots els mòduls </label>
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
              <label class="form-check-label" for="specificModules"> Mòduls concrets </label>
            </div>

            <div v-if="hasMultipleTurns && applyToAllModules" class="mt-3">
              <label class="form-label">Règims</label>
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="radio"
                  name="turnSelection"
                  id="allTurns"
                  :value="true"
                  v-model="applyToAllTurns"
                  :disabled="!canEdit"
                />
                <label class="form-check-label" for="allTurns">Tots els règims</label>
              </div>

              <div class="form-check">
                <input
                  class="form-check-input"
                  type="radio"
                  name="turnSelection"
                  id="specificTurns"
                  :value="false"
                  v-model="applyToAllTurns"
                  :disabled="!canEdit"
                />
                <label class="form-check-label" for="specificTurns">Règims concrets</label>
              </div>

              <fieldset v-if="!applyToAllTurns" class="suboption-fieldset mt-2">
                <legend class="suboption-legend">Configura els règims concrets</legend>
                <div
                  v-for="turnOption in availableTurnOptions"
                  :key="turnOption.value"
                  class="form-check"
                >
                  <input
                    :id="`turn-${turnOption.value}`"
                    v-model="modalFields.editMp.turns"
                    class="form-check-input"
                    type="checkbox"
                    :value="turnOption.value"
                    :disabled="!canEdit || isTurnOptionDisabled(turnOption.value)"
                  />
                  <label class="form-check-label" :for="`turn-${turnOption.value}`">
                    {{ turnOption.label }}
                  </label>
                </div>
                <div v-if="mpErrors.turns" class="text-danger mt-1">
                  {{ mpErrors.turns }}
                </div>
              </fieldset>
            </div>

            <fieldset v-if="!applyToAllModules" class="suboption-fieldset mt-3">
              <legend class="suboption-legend">Configura els mòduls concrets</legend>
              <label class="form-label">
                {{ hasMultipleTurns ? 'Selecciona combinacions mòdul+règim' : 'Selecciona mòduls' }}
              </label>
              <small class="text-muted d-block mb-2">Has de seleccionar almenys 2 mòduls.</small>
              <div class="module-selection table-responsive">
                <table class="table table-sm table-bordered align-middle mb-0 module-turn-grid">
                  <thead>
                    <tr>
                      <th scope="col">Mòdul</th>
                      <th
                        v-for="turnOption in effectiveTurnOptions"
                        :key="`head-${turnOption.value}`"
                        scope="col"
                        class="text-center"
                      >
                        {{ turnOption.label }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="module in availableModules" :key="`row-${module.code}`">
                      <th scope="row" class="module-cell">
                        <strong>{{ module.code }}</strong>
                        <div class="small text-muted">{{ module.name }}</div>
                      </th>
                      <td
                        v-for="turnOption in effectiveTurnOptions"
                        :key="`${module.code}-${turnOption.value}`"
                        class="text-center"
                      >
                        <button
                          type="button"
                          class="btn btn-sm w-100"
                          :class="
                            hasModuleTurnSelection(module.code, turnOption.value)
                              ? 'btn-primary'
                              : 'btn-outline-secondary'
                          "
                          :disabled="!canEdit"
                          @click="toggleModuleTurnSelection(module.code, turnOption.value)"
                        >
                          <i
                            class="bi"
                            :class="
                              hasModuleTurnSelection(module.code, turnOption.value)
                                ? 'bi-check-circle-fill'
                                : 'bi-circle'
                            "
                          ></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="mpErrors.moduleTurnSelections" class="text-danger mt-1">
                {{ mpErrors.moduleTurnSelections }}
              </div>
            </fieldset>
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
      <p class="text-muted mb-2">
        Sols has d'indicar aquells principis i enfocaments metodològics que vulgueu assegurar-vos
        que s'apliquen; la resta es contextualitzaran a les programacions didàctiques de cada mòdul.
      </p>
      <div class="card mb-2">
        <div class="card-header pcc text-white fw-bold">Principis afegits</div>
        <ul class="list-group list-group-flush principles-list">
          <li v-if="combinedAdded.length === 0" class="list-group-item text-muted">
            Encara no hi ha principis afegits
          </li>
          <li v-for="principle in combinedAdded" :key="principle.id" class="list-group-item">
            <div class="principle-row d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1 principle-title-row">
                  <i class="bi bi-check-circle-fill text-success" title="Afegit"></i>
                  <strong class="principle-title">{{ principle.name }}</strong>
                  <div class="principle-badges d-flex align-items-center gap-1">
                    <span
                      v-if="getPrincipleCategory(principle)"
                      class="badge"
                      :class="getCategoryBadgeClass(principle.category)"
                    >
                      {{ getPrincipleCategory(principle) }}
                    </span>
                    <span v-if="isMandatoryPrinciple(principle.id)" class="badge bg-danger">
                      Obligatori
                    </span>
                    <span v-else class="badge bg-secondary">No obligatori</span>
                    <span class="badge bg-success">Afegit</span>
                  </div>
                </div>
                <div class="mt-2">
                  <div v-if="shouldShowTurnSummary(principle.id)" class="text-muted small">
                    Règims: {{ buildTurnSummary(principle.id) }}
                  </div>
                  <div class="text-muted small">Mòduls: {{ buildModuleSummary(principle.id) }}</div>
                </div>
              </div>
              <div class="principle-actions btn-group-vertical" role="group">
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
        <ul class="list-group list-group-flush principles-list">
          <li v-if="combinedPending.length === 0" class="list-group-item text-muted">
            No hi ha principis pendents
          </li>
          <li v-for="principle in combinedPending" :key="principle.id" class="list-group-item">
            <div class="principle-row d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 principle-title-row">
                  <button
                    v-if="isMandatoryPrinciple(principle.id)"
                    type="button"
                    class="pending-icon-button"
                    title="Pendent"
                    aria-label="Afegir principi obligatori"
                    @click="openMethodologicalPrinciple(principle)"
                  >
                    <i class="bi bi-exclamation-circle-fill text-warning"></i>
                  </button>
                  <button
                    v-else
                    type="button"
                    class="pending-icon-button"
                    title="No afegit"
                    aria-label="Afegir principi no obligatori"
                    @click="openMethodologicalPrinciple(principle)"
                  >
                    <i class="bi bi-circle text-secondary"></i>
                  </button>
                  <strong class="principle-title">{{ principle.name }}</strong>
                  <div class="principle-badges d-flex align-items-center gap-1">
                    <span
                      v-if="getPrincipleCategory(principle)"
                      class="badge"
                      :class="getCategoryBadgeClass(principle.category)"
                    >
                      {{ getPrincipleCategory(principle) }}
                    </span>
                    <span v-if="isMandatoryPrinciple(principle.id)" class="badge bg-danger">
                      Obligatori
                    </span>
                    <span v-else class="badge bg-secondary">No obligatori</span>
                  </div>
                </div>
              </div>
              <div class="principle-actions btn-group-vertical" role="group">
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

.suboption-fieldset {
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  padding: 0.75rem;
}

.suboption-legend {
  float: none;
  width: auto;
  margin: 0;
  padding: 0 0.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #6c757d;
}

.module-selection {
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  padding: 0.75rem;
}

.module-turn-grid td {
  min-width: 110px;
}

.module-turn-grid .module-cell {
  min-width: 220px;
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

.pending-icon-button {
  border: 0;
  background: transparent;
  padding: 0;
  line-height: 1;
  cursor: pointer;
}

.principle-description {
  color: #6c757d;
  font-size: 0.9rem;
  font-style: italic;
}

@media (max-width: 576px) {
  .principle-row {
    flex-direction: column;
    gap: 0.75rem;
  }

  .principle-title-row {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .principle-badges {
    flex-basis: 100%;
    width: 100%;
  }

  .principle-actions {
    align-self: center;
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: 0.5rem;
  }
}
</style>
