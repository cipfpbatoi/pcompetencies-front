<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import * as yup from 'yup'
import { useDataStore } from '../stores/data'
import { api } from '../repositories/api.js'
import { useFormValidation } from '../composables/useFormValidation'
import { statusClass } from '../utils/utils.js'
import ModalComponent from './ModalComp.vue'
import ActionButton from './ActionButton.vue'

const props = defineProps({
  pccId: {
    type: Number,
    required: true
  }
})

const store = useDataStore()
const { pcc, cycle, user } = storeToRefs(store)
const {
  addMessage,
  createIndividualTrainingPlan,
  updateIndividualTrainingPlan,
  deleteIndividualTrainingPlan,
  sendIndividualTrainingPlan,
  copyIndividualTrainingPlan
} = store

// ==========================================
// LISTAT
// ==========================================
const plans = computed(() => pcc.value?.individualTrainingPlans || [])

// Si s'arriba des de la pantalla de gestió amb ?openPlanId=X (pla pendent), s'obri
// directament el modal d'edició d'eixe pla
const route = useRoute()
const router = useRouter()

onMounted(() => {
  const openPlanId = route.query.openPlanId ? Number(route.query.openPlanId) : null
  if (!openPlanId) return

  const plan = plans.value.find((item) => item.id === openPlanId)
  if (plan) {
    openEditModal(plan)
  }

  const restQuery = { ...route.query }
  delete restQuery.openPlanId
  router.replace({ query: restQuery })
})

const currentSchoolYear = ref('')

onMounted(async () => {
  try {
    const response = await api.getCurrentData()
    currentSchoolYear.value = response.data?.currentSchoolYear?.course || ''
  } catch (error) {
    addMessage('error', error)
  }
})

const isPlanOfCurrentSchoolYear = (plan) =>
  !currentSchoolYear.value || plan.courseYear === currentSchoolYear.value

const currentYearPlans = computed(() =>
  plans.value.filter((plan) => isPlanOfCurrentSchoolYear(plan))
)
const historicPlans = computed(() => plans.value.filter((plan) => !isPlanOfCurrentSchoolYear(plan)))

// Eliminar un pla que ja no és pendent requerix ser admin o coordinador FCT
// (posar pendent / rebutjar / aprovar es fan des de la pantalla de gestió, no ací)
const canDeleteNonPendingPlan = computed(
  () =>
    !!user.value?.info?.roles?.includes('ROLE_ADMIN') ||
    !!user.value?.info?.roles?.includes('ROLE_COORDINADOR_FCT')
)

// Un pla enviat o aprovat ja no es pot editar (nomes pendent o rebutjat)
const isPlanEditable = (plan) => plan.status !== 'enviada' && plan.status !== 'aprovada'

const TURN_LABELS = {
  presential: 'Presencial',
  'half-presential': 'Semi-presencial'
}
const getTurnLabel = (turn) => TURN_LABELS[turn] || turn

// Mòduls inclosos en un pla: la resposta del pla ja porta moduleHours[] amb
// { hours, module: { code, name } }, un element per mòdul inclòs
const getPlanModulesLabel = (plan) =>
  (plan.moduleHours || [])
    .map((entry) => `${entry.module?.code} - ${entry.module?.name} (${entry.hours}h)`)
    .join(', ')

const availableTurns = computed(() => cycle.value?.availableTurns || [])

// ==========================================
// MODAL: CREAR/EDITAR PLA
// ==========================================
const planFormModalRef = ref(null)
const isSaving = ref(false)
const isLoadingItems = ref(false)
const editingPlanId = ref(null)
const modules = ref([])
const selectionErrorLines = ref([])
const currentStep = ref(1)
const activeModuleCode = ref('')

const scrollModalToTop = () => {
  const modalBody = document.querySelector('#individualTrainingPlanModal .modal-body')
  if (modalBody) {
    modalBody.scrollTop = 0
  }
}

const form = reactive({
  name: '',
  turn: '',
  courseLevel: '',
  observations: '',
  requiresExtraordinaryAuthorizations: false,
  extraordinaryAuthorizations: '',
  moduleHours: {}
})

const selectedLearningResultIds = ref(new Set())
const selectedEvaluationCriteriaIds = ref(new Set())

const planValidation = useFormValidation(
  yup.object({
    name: yup.string().trim().required('El nom és obligatori').max(255, 'Màxim 255 caràcters'),
    turn: yup.string().required('Cal seleccionar un torn'),
    courseLevel: yup
      .number()
      .typeError('Cal seleccionar un curs')
      .oneOf([1, 2], 'Cal seleccionar un curs')
      .required('Cal seleccionar un curs'),
    extraordinaryAuthorizations: yup.string().when('requiresExtraordinaryAuthorizations', {
      is: true,
      then: (schema) =>
        schema.trim().required('Cal descriure les autoritzacions extraordinàries necessàries')
    })
  })
)
const { errors, validate, clearErrors } = planValidation

const isEditing = computed(() => !!editingPlanId.value)

const modalTitle = computed(() =>
  isEditing.value ? 'Editar pla formatiu individual' : 'Nou pla formatiu individual'
)

const selectedCount = computed(
  () => selectedLearningResultIds.value.size + selectedEvaluationCriteriaIds.value.size
)

// ==========================================
// CANVIS SENSE GUARDAR
// ==========================================
const savedSnapshot = ref('')

const buildFormSnapshot = () =>
  JSON.stringify({
    name: form.name,
    turn: form.turn,
    courseLevel: form.courseLevel,
    observations: form.observations,
    requiresExtraordinaryAuthorizations: form.requiresExtraordinaryAuthorizations,
    extraordinaryAuthorizations: form.extraordinaryAuthorizations,
    learningResultIds: [...selectedLearningResultIds.value].sort((a, b) => a - b),
    evaluationCriteriaIds: [...selectedEvaluationCriteriaIds.value].sort((a, b) => a - b),
    moduleHours: relevantModuleHoursEntries.value
  })

const markSnapshotAsSaved = () => {
  savedSnapshot.value = buildFormSnapshot()
}

const isDirty = computed(() => buildFormSnapshot() !== savedSnapshot.value)

const getModuleCourseLevel = (moduleCode) => {
  const module = cycle.value?.modules?.find((item) => item.code === moduleCode)
  return module?.courseLevel === 2 ? 2 : 1
}

// Un pla de 1r pot incloure mòduls d'1r i de 2n; un pla de 2n només pot incloure mòduls de 2n
const isModuleCourseAllowed = (moduleCourseLevel, planCourseLevel) =>
  moduleCourseLevel === planCourseLevel || (planCourseLevel === 1 && moduleCourseLevel === 2)

// Només mòduls amb algun RA seleccionable (amb programació i RA dualitzables per a este torn)
const selectableModulesByCourse = computed(() => {
  const groups = { 1: [], 2: [] }
  modules.value
    .filter((mod) => mod.learningResults.length > 0)
    .forEach((mod) => {
      groups[getModuleCourseLevel(mod.moduleCode)].push(mod)
    })
  return groups
})

// Mòduls seleccionables per al curs del pla, agrupats per curs (per mostrar-los separats)
const allowedModulesByCourse = computed(() => {
  const planCourseLevel = Number(form.courseLevel)
  return {
    1: isModuleCourseAllowed(1, planCourseLevel) ? selectableModulesByCourse.value[1] : [],
    2: isModuleCourseAllowed(2, planCourseLevel) ? selectableModulesByCourse.value[2] : []
  }
})

const selectableModulesForCourse = computed(() => [
  ...allowedModulesByCourse.value[1],
  ...allowedModulesByCourse.value[2]
])

const activeModule = computed(
  () => modules.value.find((mod) => mod.moduleCode === activeModuleCode.value) || null
)

const learningResultIndex = computed(() => {
  const map = new Map()
  modules.value.forEach((mod) => {
    mod.learningResults.forEach((lr) => map.set(lr.id, { lr, mod }))
  })
  return map
})

const evaluationCriteriaIndex = computed(() => {
  const map = new Map()
  modules.value.forEach((mod) => {
    mod.learningResults.forEach((lr) => {
      lr.evaluationCriterias.forEach((ce) => map.set(ce.id, { ce, lr, mod }))
    })
  })
  return map
})

const selectedSummaryByModule = computed(() => {
  const byModule = new Map()

  const addItem = (moduleCode, moduleName, item) => {
    if (!byModule.has(moduleCode)) {
      byModule.set(moduleCode, { moduleCode, moduleName, items: [] })
    }
    byModule.get(moduleCode).items.push(item)
  }

  selectedLearningResultIds.value.forEach((id) => {
    const entry = learningResultIndex.value.get(id)
    if (!entry) return
    addItem(entry.mod.moduleCode, entry.mod.moduleName, {
      key: `lr-${id}`,
      label: `RA${entry.lr.number}`,
      remove: () => toggleLearningResult(entry.lr)
    })
  })
  selectedEvaluationCriteriaIds.value.forEach((id) => {
    const entry = evaluationCriteriaIndex.value.get(id)
    if (!entry) return
    addItem(entry.mod.moduleCode, entry.mod.moduleName, {
      key: `ce-${id}`,
      label: entry.ce.code,
      remove: () => toggleEvaluationCriteria(entry.ce)
    })
  })

  return [...byModule.values()]
})

const modulesWithSelectionCodes = computed(
  () => new Set(selectedSummaryByModule.value.map((entry) => entry.moduleCode))
)

const suggestedHoursByModuleCode = computed(() => {
  const map = new Map()
  modules.value.forEach((mod) => map.set(mod.moduleCode, mod.suggestedHours ?? 0))
  return map
})

// Hores en empresa per a cada mòdul amb algun RA/CE seleccionat (calen per al pla, una per mòdul)
const relevantModuleHoursEntries = computed(() =>
  selectedSummaryByModule.value
    .map((entry) => [entry.moduleCode, Number(form.moduleHours[entry.moduleCode]) || 0])
    .sort((a, b) => a[0].localeCompare(b[0]))
)

const totalModuleHours = computed(() =>
  relevantModuleHoursEntries.value.reduce((sum, [, hours]) => sum + hours, 0)
)

// El curs (courseLevel) és un camp obligatori i fix per a tot el pla: en canviar-lo es lleven
// del pla les RA/CE que ja no pertanguen al nou curs (el backend ho fa igual en editar)
const handleCourseLevelChange = () => {
  const courseLevel = Number(form.courseLevel)
  const droppedCount = selectedSummaryByModule.value
    .filter((entry) => !isModuleCourseAllowed(getModuleCourseLevel(entry.moduleCode), courseLevel))
    .reduce((count, entry) => count + entry.items.length, 0)

  selectedLearningResultIds.value = new Set(
    [...selectedLearningResultIds.value].filter((id) => {
      const entry = learningResultIndex.value.get(id)
      return entry && isModuleCourseAllowed(getModuleCourseLevel(entry.mod.moduleCode), courseLevel)
    })
  )
  selectedEvaluationCriteriaIds.value = new Set(
    [...selectedEvaluationCriteriaIds.value].filter((id) => {
      const entry = evaluationCriteriaIndex.value.get(id)
      return entry && isModuleCourseAllowed(getModuleCourseLevel(entry.mod.moduleCode), courseLevel)
    })
  )

  if (droppedCount > 0) {
    addMessage('info', `S'han llevat ${droppedCount} seleccions que no corresponien al curs triat`)
  }

  if (!selectableModulesForCourse.value.some((mod) => mod.moduleCode === activeModuleCode.value)) {
    activeModuleCode.value = ''
  }
}

const MODULE_BADGE_CLASSES = [
  'bg-primary text-white',
  'bg-success text-white',
  'bg-danger text-white',
  'bg-dark text-white',
  'bg-warning text-dark',
  'bg-info text-dark',
  'bg-secondary text-white'
]

const MODULE_BADGE_SUBTLE_CLASSES = [
  'bg-primary-subtle text-primary-emphasis',
  'bg-success-subtle text-success-emphasis',
  'bg-danger-subtle text-danger-emphasis',
  'bg-dark-subtle text-dark-emphasis',
  'bg-warning-subtle text-warning-emphasis',
  'bg-info-subtle text-info-emphasis',
  'bg-secondary-subtle text-secondary-emphasis'
]

const moduleColorIndexByCode = computed(() => {
  const map = new Map()
  modules.value.forEach((mod, index) => {
    map.set(mod.moduleCode, index % MODULE_BADGE_CLASSES.length)
  })
  return map
})

const getModuleBadgeClass = (moduleCode) =>
  MODULE_BADGE_CLASSES[moduleColorIndexByCode.value.get(moduleCode) ?? 0]

const getModuleSubtleClass = (moduleCode) =>
  MODULE_BADGE_SUBTLE_CLASSES[moduleColorIndexByCode.value.get(moduleCode) ?? 0]

const applyAvailableItems = (data, keepServerSelection) => {
  modules.value = data

  const validLrIds = new Set()
  const validCeIds = new Set()
  const selectedLrIds = new Set()
  const selectedCeIds = new Set()

  data.forEach((mod) => {
    mod.learningResults.forEach((lr) => {
      validLrIds.add(lr.id)
      if (lr.selected) selectedLrIds.add(lr.id)
      lr.evaluationCriterias.forEach((ce) => {
        validCeIds.add(ce.id)
        if (ce.selected) selectedCeIds.add(ce.id)
      })
    })
  })

  if (keepServerSelection) {
    selectedLearningResultIds.value = selectedLrIds
    selectedEvaluationCriteriaIds.value = selectedCeIds
  } else {
    selectedLearningResultIds.value = new Set(
      [...selectedLearningResultIds.value].filter((id) => validLrIds.has(id))
    )
    selectedEvaluationCriteriaIds.value = new Set(
      [...selectedEvaluationCriteriaIds.value].filter((id) => validCeIds.has(id))
    )
  }
}

const loadAvailableItems = async ({ keepServerSelection = false } = {}) => {
  if (!form.turn) {
    modules.value = []
    return
  }
  isLoadingItems.value = true
  try {
    const response = await api.getIndividualTrainingPlanAvailableItems(
      props.pccId,
      form.turn,
      editingPlanId.value || undefined
    )
    applyAvailableItems(response.data, keepServerSelection)
  } catch (error) {
    addMessage('error', error)
    modules.value = []
  } finally {
    isLoadingItems.value = false
  }
}

const handleTurnChange = () => {
  loadAvailableItems({ keepServerSelection: false })
}

const openCreateModal = async () => {
  editingPlanId.value = null
  form.name = ''
  form.turn = availableTurns.value[0] || ''
  form.courseLevel = ''
  form.observations = ''
  form.requiresExtraordinaryAuthorizations = false
  form.extraordinaryAuthorizations = ''
  form.moduleHours = {}
  selectedLearningResultIds.value = new Set()
  selectedEvaluationCriteriaIds.value = new Set()
  selectionErrorLines.value = []
  currentStep.value = 1
  activeModuleCode.value = ''
  clearErrors()
  planFormModalRef.value?.show()
  await loadAvailableItems()
  markSnapshotAsSaved()
}

const openEditModal = async (plan) => {
  editingPlanId.value = plan.id
  form.name = plan.name
  form.turn = plan.turn
  form.courseLevel = plan.courseLevel
  form.observations = plan.observations || ''
  form.requiresExtraordinaryAuthorizations = !!plan.requiresExtraordinaryAuthorizations
  form.extraordinaryAuthorizations = plan.extraordinaryAuthorizations || ''
  form.moduleHours = Object.fromEntries(
    (plan.moduleHours || [])
      .filter((entry) => entry.module?.code)
      .map((entry) => [entry.module.code, entry.hours])
  )
  selectionErrorLines.value = []
  currentStep.value = 1
  activeModuleCode.value = ''
  clearErrors()
  planFormModalRef.value?.show()
  await loadAvailableItems({ keepServerSelection: true })
  markSnapshotAsSaved()
}

const goToStep2 = async () => {
  const isValid = await validate({
    name: form.name,
    turn: form.turn,
    courseLevel: form.courseLevel
  })
  if (!isValid) return

  currentStep.value = 2

  if (!selectableModulesForCourse.value.some((mod) => mod.moduleCode === activeModuleCode.value)) {
    activeModuleCode.value = ''
  }
}

const goToStep1 = () => {
  currentStep.value = 1
}

// Prefixa les hores del mòdul amb la suggerida pel backend, sense sobreescriure un valor ja fixat
const ensureSuggestedHours = (moduleCode) => {
  if (!moduleCode) return
  const current = form.moduleHours[moduleCode]
  if (current !== undefined && current !== null && current !== '') return

  const mod = modules.value.find((item) => item.moduleCode === moduleCode)
  form.moduleHours[moduleCode] = mod?.suggestedHours ?? 0
}

const toggleLearningResult = (learningResult) => {
  const next = new Set(selectedLearningResultIds.value)
  if (next.has(learningResult.id)) {
    next.delete(learningResult.id)
    // En desmarcar el RA, es desactiven i es netegen els seus criteris
    const nextCe = new Set(selectedEvaluationCriteriaIds.value)
    learningResult.evaluationCriterias.forEach((ce) => nextCe.delete(ce.id))
    selectedEvaluationCriteriaIds.value = nextCe
  } else {
    next.add(learningResult.id)
    ensureSuggestedHours(activeModuleCode.value)
  }
  selectedLearningResultIds.value = next
}

const toggleEvaluationCriteria = (evaluationCriteria) => {
  const next = new Set(selectedEvaluationCriteriaIds.value)
  if (next.has(evaluationCriteria.id)) {
    next.delete(evaluationCriteria.id)
  } else {
    next.add(evaluationCriteria.id)
    ensureSuggestedHours(activeModuleCode.value)
  }
  selectedEvaluationCriteriaIds.value = next
}

const handleSavePlan = async () => {
  const isValid = await validate({
    name: form.name,
    turn: form.turn,
    courseLevel: form.courseLevel,
    requiresExtraordinaryAuthorizations: form.requiresExtraordinaryAuthorizations,
    extraordinaryAuthorizations: form.extraordinaryAuthorizations
  })
  if (!isValid) return

  if (selectedCount.value === 0) {
    selectionErrorLines.value = [
      "Cal seleccionar almenys un resultat d'aprenentatge o criteri d'avaluació"
    ]
    scrollModalToTop()
    return
  }

  const missingCriteriaByModule = modules.value
    .map((mod) => ({
      moduleName: mod.moduleName,
      raLabels: mod.learningResults
        .filter(
          (lr) =>
            lr.allCriteriaEligible &&
            selectedLearningResultIds.value.has(lr.id) &&
            !lr.evaluationCriterias.some((ce) => selectedEvaluationCriteriaIds.value.has(ce.id))
        )
        .map((lr) => `RA${lr.number}`)
    }))
    .filter((entry) => entry.raLabels.length > 0)

  if (missingCriteriaByModule.length > 0) {
    selectionErrorLines.value = missingCriteriaByModule.map(
      (entry) =>
        `${entry.moduleName}: cal marcar algun criteri d'avaluació de ${entry.raLabels.join(', ')}`
    )
    scrollModalToTop()
    return
  }
  const modulesMissingHours = selectedSummaryByModule.value.filter(
    (entry) => !(Number(form.moduleHours[entry.moduleCode]) > 0)
  )

  if (modulesMissingHours.length > 0) {
    selectionErrorLines.value = modulesMissingHours.map(
      (entry) => `${entry.moduleName}: cal indicar les hores en empresa d'este mòdul`
    )
    scrollModalToTop()
    return
  }
  selectionErrorLines.value = []

  const moduleHours = Object.fromEntries(relevantModuleHoursEntries.value)

  const payload = {
    name: form.name.trim(),
    turn: form.turn,
    courseLevel: Number(form.courseLevel),
    observations: form.observations.trim() || null,
    requiresExtraordinaryAuthorizations: form.requiresExtraordinaryAuthorizations,
    extraordinaryAuthorizations: form.requiresExtraordinaryAuthorizations
      ? form.extraordinaryAuthorizations.trim() || null
      : null,
    learningResultIds: [...selectedLearningResultIds.value],
    evaluationCriteriaIds: [...selectedEvaluationCriteriaIds.value],
    moduleHours
  }

  isSaving.value = true
  try {
    const result = editingPlanId.value
      ? await updateIndividualTrainingPlan(props.pccId, editingPlanId.value, payload)
      : await createIndividualTrainingPlan(props.pccId, payload)

    if (result) {
      markSnapshotAsSaved()
      planFormModalRef.value?.hide()
    }
  } finally {
    isSaving.value = false
  }
}

// ==========================================
// ELIMINAR PLA
// ==========================================
const deletingPlanId = ref(null)

const handleDeletePlan = async (plan) => {
  if (!confirm(`Segur que vols eliminar el pla formatiu individual "${plan.name}"?`)) return

  deletingPlanId.value = plan.id
  try {
    await deleteIndividualTrainingPlan(props.pccId, plan.id)
  } finally {
    deletingPlanId.value = null
  }
}

// ==========================================
// PDF (Annex I)
// ==========================================
const downloadingPlanId = ref(null)

const sanitizeFileNamePart = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const handleDownloadPlanPdf = async (plan) => {
  downloadingPlanId.value = plan.id
  try {
    const response = await api.getIndividualTrainingPlanPdf(props.pccId, plan.id)
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `AnnexI-PlaFormatiuIndividual-${sanitizeFileNamePart(plan.name)}.pdf`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setTimeout(() => URL.revokeObjectURL(url), 100)
  } catch (error) {
    addMessage('error', error)
  } finally {
    downloadingPlanId.value = null
  }
}

// ==========================================
// ESTAT DEL PLA (pendent -> enviada -> aprovada/rebutjada)
// ==========================================
const changingStatusPlanId = ref(null)

const getErrorMessage = (error) => {
  if (typeof error?.response?.data === 'string') return error.response.data
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    error?.message ||
    'Error desconegut'
  )
}

// ==========================================
// MODAL: ERROR EN UNA ACCIÓ SOBRE UN PLA
// ==========================================
const actionErrorModalRef = ref(null)
const actionErrorTitle = ref('')
const actionErrorMessage = ref('')

const showActionError = (title, error) => {
  actionErrorTitle.value = title
  actionErrorMessage.value = getErrorMessage(error)
  actionErrorModalRef.value?.show()
}

const handleSendPlan = async (plan) => {
  if (!confirm(`Vas a enviar el pla formatiu individual "${plan.name}" per a la seua aprovació.`))
    return

  changingStatusPlanId.value = plan.id
  try {
    await sendIndividualTrainingPlan(props.pccId, plan.id)
  } catch (error) {
    showActionError(`No s'ha pogut enviar el pla "${plan.name}"`, error)
  } finally {
    changingStatusPlanId.value = null
  }
}

const handleCopyPlanToCurrentYear = async (plan) => {
  if (
    !confirm(
      `Es crearà una còpia del pla formatiu individual "${plan.name}" per al curs escolar actual, amb estat "pendent". El pla original no es modificarà.`
    )
  )
    return

  changingStatusPlanId.value = plan.id
  try {
    await copyIndividualTrainingPlan(props.pccId, plan.id)
  } finally {
    changingStatusPlanId.value = null
  }
}
</script>

<template>
  <div>
    <ModalComponent
      ref="planFormModalRef"
      modal-id="individualTrainingPlanModal"
      :title="modalTitle"
      size="xl"
      scrollable
      :saving="isSaving"
      :show-save-button="isEditing || currentStep === 2"
      save-button-text="Guarda"
      @save="handleSavePlan"
    >
      <template #header>
        <h1 id="individualTrainingPlanModalLabel" class="modal-title fs-5">
          {{ modalTitle }}
          <span v-if="isDirty" class="badge bg-warning text-dark ms-2">
            <i class="bi bi-exclamation-circle-fill"></i> Canvis sense guardar
          </span>
        </h1>
      </template>

      <!-- NOM, TORN, CURS I OBSERVACIONS: sempre visibles -->
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <label class="form-label fw-bold">Nom del pla</label>
          <input
            v-model="form.name"
            type="text"
            class="form-control"
            placeholder="Ex: Pla PFI - Maria"
          />
          <p v-if="errors.name" class="text-danger small mb-0">{{ errors.name }}</p>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label fw-bold">Torn</label>
          <select v-model="form.turn" class="form-select" @change="handleTurnChange">
            <option value="">-- Selecciona torn --</option>
            <option v-for="turn in availableTurns" :key="turn" :value="turn">
              {{ getTurnLabel(turn) }}
            </option>
          </select>
          <p v-if="errors.turn" class="text-danger small mb-0">{{ errors.turn }}</p>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label fw-bold">Curs</label>
          <select v-model="form.courseLevel" class="form-select" @change="handleCourseLevelChange">
            <option value="">-- Selecciona curs --</option>
            <option :value="1">1r Curs</option>
            <option :value="2">2n Curs</option>
          </select>
          <p v-if="errors.courseLevel" class="text-danger small mb-0">{{ errors.courseLevel }}</p>
        </div>
        <div class="col-12">
          <label class="form-label fw-bold">Observacions</label>
          <textarea v-model="form.observations" class="form-control" rows="2"></textarea>
        </div>
        <div class="col-12">
          <div class="form-check">
            <input
              id="requiresExtraordinaryAuthorizations"
              v-model="form.requiresExtraordinaryAuthorizations"
              class="form-check-input"
              type="checkbox"
            />
            <label class="form-check-label fw-bold" for="requiresExtraordinaryAuthorizations">
              Requereix autoritzacions extraordinàries
            </label>
          </div>
          <div v-if="form.requiresExtraordinaryAuthorizations" class="mt-2">
            <label class="form-label fw-bold">Autoritzacions necessàries</label>
            <textarea
              v-model="form.extraordinaryAuthorizations"
              class="form-control"
              rows="2"
              placeholder="Descriu quines autoritzacions extraordinàries calen"
            ></textarea>
            <p v-if="errors.extraordinaryAuthorizations" class="text-danger small mb-0">
              {{ errors.extraordinaryAuthorizations }}
            </p>
          </div>
        </div>
      </div>

      <!-- Editant: tot en un sol pas. Creant: la resta només apareix al pas 2 -->
      <template v-if="isEditing || currentStep === 2">
        <hr />

        <div v-if="selectionErrorLines.length" class="alert alert-danger py-2 px-3 mb-3">
          <div v-for="(line, index) in selectionErrorLines" :key="index">{{ line }}</div>
        </div>

        <div v-if="isLoadingItems" class="text-center py-4">
          <span class="spinner-border text-primary"></span>
        </div>

        <template v-else>
          <h6 class="fw-bold">Afegir RA/CE d'un mòdul</h6>
          <p v-if="selectableModulesForCourse.length === 0" class="alert alert-secondary mb-0">
            Aquest cicle no té cap mòdul dualitzable amb programació per a aquest torn.
          </p>

          <template v-else>
            <label class="form-label fw-bold">Mòdul</label>
            <select v-model="activeModuleCode" class="form-select mb-3">
              <option value="">-- Selecciona un mòdul --</option>
              <optgroup v-if="allowedModulesByCourse[1].length" label="1r Curs">
                <option
                  v-for="mod in allowedModulesByCourse[1]"
                  :key="mod.moduleCode"
                  :value="mod.moduleCode"
                >
                  {{ modulesWithSelectionCodes.has(mod.moduleCode) ? '✓ ' : ''
                  }}{{ mod.moduleName }} ({{ mod.moduleCode }})
                </option>
              </optgroup>
              <optgroup v-if="allowedModulesByCourse[2].length" label="2n Curs">
                <option
                  v-for="mod in allowedModulesByCourse[2]"
                  :key="mod.moduleCode"
                  :value="mod.moduleCode"
                >
                  {{ modulesWithSelectionCodes.has(mod.moduleCode) ? '✓ ' : ''
                  }}{{ mod.moduleName }} ({{ mod.moduleCode }})
                </option>
              </optgroup>
            </select>

            <div v-if="activeModule" class="card mb-3">
              <div
                class="card-header bg-light fw-bold d-flex justify-content-between align-items-center"
              >
                <span>{{ activeModule.moduleName }} ({{ activeModule.moduleCode }})</span>
                <span v-if="!activeModule.hasSyllabus" class="badge bg-warning text-dark">
                  Sense programació per a este torn
                </span>
              </div>
              <ul class="list-group list-group-flush">
                <li v-for="lr in activeModule.learningResults" :key="lr.id" class="list-group-item">
                  <div class="row g-2 align-items-start">
                    <div class="col">
                      <div v-if="lr.allCriteriaEligible" class="form-check mb-1">
                        <input
                          :id="`lr-${lr.id}`"
                          class="form-check-input"
                          type="checkbox"
                          :checked="selectedLearningResultIds.has(lr.id)"
                          @change="toggleLearningResult(lr)"
                        />
                        <label class="form-check-label fw-bold" :for="`lr-${lr.id}`">
                          <strong>RA{{ lr.number }}</strong> - {{ lr.descriptor }} (tot el RA)
                        </label>
                      </div>
                      <div v-else class="fw-bold mb-1">
                        <strong>RA{{ lr.number }}</strong> - {{ lr.descriptor }}
                      </div>

                      <div
                        class="form-check ms-3"
                        v-for="ce in lr.evaluationCriterias"
                        :key="ce.id"
                      >
                        <input
                          :id="`ce-${ce.id}`"
                          class="form-check-input"
                          type="checkbox"
                          :checked="selectedEvaluationCriteriaIds.has(ce.id)"
                          :disabled="
                            lr.allCriteriaEligible && !selectedLearningResultIds.has(lr.id)
                          "
                          @change="toggleEvaluationCriteria(ce)"
                        />
                        <label class="form-check-label" :for="`ce-${ce.id}`">
                          <strong>{{ ce.code }}</strong> - {{ ce.description }}
                        </label>
                      </div>
                    </div>

                    <div class="col-auto">
                      <span
                        class="badge"
                        :class="lr.coverage === 'complete' ? 'bg-success' : 'bg-secondary'"
                        :title="
                          lr.coverage === 'complete'
                            ? 'Este RA només es treballa en la situació en empresa: es cobreix sencer'
                            : `Este RA també es treballa en altres situacions d'aprenentatge: sols es cobreix en part`
                        "
                      >
                        <i class="bi bi-check-lg"></i>
                        {{ lr.coverage === 'complete' ? 'Solo empresa' : 'Empresa + Centro' }}
                      </span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </template>

          <hr />

          <div class="card mb-3">
            <div class="card-header bg-light fw-bold">
              <i class="bi bi-clipboard-check me-1"></i> Contingut actual del pla
            </div>
            <div class="card-body">
              <h6 class="fw-bold">Resum de la selecció</h6>
              <p v-if="selectedSummaryByModule.length === 0" class="text-muted small mb-0">
                Encara no has seleccionat cap RA ni criteri.
              </p>
              <div v-else class="d-flex flex-wrap gap-2">
                <span
                  v-for="entry in selectedSummaryByModule"
                  :key="entry.moduleCode"
                  class="badge py-2 px-2"
                  :class="getModuleBadgeClass(entry.moduleCode)"
                >
                  <strong class="me-1">{{ entry.moduleName }} · RA:</strong>
                  <template v-for="(item, index) in entry.items" :key="item.key"
                    ><span
                      class="pfi-summary-item"
                      role="button"
                      :title="`Llevar ${item.label}`"
                      @click="item.remove"
                      >{{ item.label }}</span
                    ><span v-if="index < entry.items.length - 1">,&nbsp;</span></template
                  >
                </span>
              </div>

              <template v-if="selectedSummaryByModule.length > 0">
                <hr />
                <h6 class="fw-bold">Hores en empresa per mòdul</h6>
                <div
                  v-for="entry in selectedSummaryByModule"
                  :key="entry.moduleCode"
                  class="d-flex justify-content-between align-items-center gap-2 mb-2 rounded px-3 py-2"
                  :class="getModuleSubtleClass(entry.moduleCode)"
                >
                  <span class="fw-bold">
                    {{ entry.moduleName }} (Hores SA Dualitzables PD:
                    {{ suggestedHoursByModuleCode.get(entry.moduleCode) || 0 }}h)
                  </span>
                  <div class="input-group input-group-sm" style="width: 10rem">
                    <input
                      v-model.number="form.moduleHours[entry.moduleCode]"
                      type="number"
                      min="1"
                      class="form-control"
                    />
                    <span class="input-group-text">hores</span>
                  </div>
                </div>

                <div
                  class="d-flex justify-content-between align-items-center fw-bold border-top pt-2 mt-1 fs-5 text-primary"
                >
                  <span>Total hores</span>
                  <span>{{ totalModuleHours }}h</span>
                </div>
              </template>
            </div>
          </div>
        </template>
      </template>
      <div v-else-if="isLoadingItems" class="text-center py-4">
        <span class="spinner-border text-primary"></span>
      </div>

      <template v-if="!isEditing" #footer-buttons>
        <button v-if="currentStep === 1" type="button" class="btn btn-primary" @click="goToStep2">
          Següent <i class="bi bi-arrow-right"></i>
        </button>
        <button v-else type="button" class="btn btn-outline-secondary" @click="goToStep1">
          <i class="bi bi-arrow-left"></i> Enrere
        </button>
      </template>
    </ModalComponent>

    <ModalComponent
      ref="actionErrorModalRef"
      modal-id="planActionErrorModal"
      :title="actionErrorTitle"
      header-class="bg-danger text-white"
      :show-save-button="false"
      close-button-text="Tanca"
    >
      <div class="alert alert-danger mb-0 error-message-text">
        {{ actionErrorMessage }}
      </div>
    </ModalComponent>

    <div class="d-flex justify-content-between align-items-center mb-3">
      <p class="mb-0 text-muted">
        Gestiona els plans formatius individuals (RA/CE dualitzables) d'este PCC.
      </p>
      <ActionButton
        title="Nou pla formatiu individual"
        buttonClass="btn-success"
        iconClass="bi bi-plus-circle-fill"
        @clicked="openCreateModal"
      />
    </div>

    <div v-if="plans.length === 0" class="alert alert-secondary">
      Encara no hi ha cap pla formatiu individual creat per a este PCC.
    </div>

    <template v-else>
      <h5 class="fw-bold">Plans del curs actual</h5>
      <div v-if="currentYearPlans.length === 0" class="alert alert-secondary">
        No hi ha cap pla del curs escolar actual.
      </div>
      <div v-else class="table-responsive">
        <table class="table table-bordered align-middle">
          <thead class="table-light">
            <tr>
              <th>Nom</th>
              <th>Curs escolar</th>
              <th>Torn</th>
              <th>Curs</th>
              <th>Estat</th>
              <th>Mòduls</th>
              <th class="text-center">Accions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="plan in currentYearPlans" :key="plan.id">
              <td>
                {{ plan.name }}
                <i
                  v-if="plan.requiresExtraordinaryAuthorizations"
                  class="bi bi-exclamation-triangle-fill text-warning ms-1"
                  :title="
                    plan.extraordinaryAuthorizations || 'Requereix autoritzacions extraordinàries'
                  "
                ></i>
              </td>
              <td>{{ plan.courseYear }}</td>
              <td>
                <span class="badge bg-info text-dark">{{ getTurnLabel(plan.turn) }}</span>
              </td>
              <td>{{ plan.courseLevel === 2 ? '2n' : '1r' }}</td>
              <td>
                <span
                  class="badge"
                  :class="statusClass(plan.status)"
                  :title="plan.status === 'rebutjada' ? plan.rejectedMessage?.reason : ''"
                >
                  {{ plan.status }}
                </span>
              </td>
              <td>{{ getPlanModulesLabel(plan) }}</td>
              <td class="text-center">
                <div class="btn-group" role="group">
                  <button
                    class="btn btn-sm btn-outline-danger"
                    title="Veure PDF (Annex I)"
                    :disabled="downloadingPlanId === plan.id"
                    @click="handleDownloadPlanPdf(plan)"
                  >
                    <span
                      v-if="downloadingPlanId === plan.id"
                      class="spinner-border spinner-border-sm"
                    ></span>
                    <i v-else class="bi bi-file-earmark-pdf-fill"></i>
                  </button>
                  <button
                    v-if="isPlanEditable(plan)"
                    class="btn btn-sm btn-outline-primary"
                    title="Editar pla"
                    @click="openEditModal(plan)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    v-if="plan.status === 'pendent' || canDeleteNonPendingPlan"
                    class="btn btn-sm btn-outline-danger"
                    title="Eliminar pla"
                    :disabled="deletingPlanId === plan.id"
                    @click="handleDeletePlan(plan)"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                  <button
                    v-if="['pendent', 'rebutjada'].includes(plan.status)"
                    class="btn btn-sm btn-outline-info"
                    title="Enviar per a aprovació"
                    :disabled="changingStatusPlanId === plan.id"
                    @click="handleSendPlan(plan)"
                  >
                    <i class="bi bi-send-fill"></i>
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    title="Duplicar pla (crea una còpia per al curs actual)"
                    :disabled="changingStatusPlanId === plan.id"
                    @click="handleCopyPlanToCurrentYear(plan)"
                  >
                    <i class="bi bi-files"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template v-if="historicPlans.length > 0">
        <h5 class="fw-bold mt-4">Històric (cursos anteriors)</h5>
        <div class="table-responsive">
          <table class="table table-bordered align-middle">
            <thead class="table-light">
              <tr>
                <th>Nom</th>
                <th>Curs escolar</th>
                <th>Torn</th>
                <th>Curs</th>
                <th>Estat</th>
                <th>Mòduls</th>
                <th class="text-center">Accions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="plan in historicPlans" :key="plan.id">
                <td>
                  {{ plan.name }}
                  <i
                    v-if="plan.requiresExtraordinaryAuthorizations"
                    class="bi bi-exclamation-triangle-fill text-warning ms-1"
                    :title="
                      plan.extraordinaryAuthorizations || 'Requereix autoritzacions extraordinàries'
                    "
                  ></i>
                </td>
                <td>{{ plan.courseYear }}</td>
                <td>
                  <span class="badge bg-info text-dark">{{ getTurnLabel(plan.turn) }}</span>
                </td>
                <td>{{ plan.courseLevel === 2 ? '2n' : '1r' }}</td>
                <td>
                  <span
                    class="badge"
                    :class="statusClass(plan.status)"
                    :title="plan.status === 'rebutjada' ? plan.rejectedMessage?.reason : ''"
                  >
                    {{ plan.status }}
                  </span>
                </td>
                <td>{{ getPlanModulesLabel(plan) }}</td>
                <td class="text-center">
                  <div class="btn-group" role="group">
                    <button
                      class="btn btn-sm btn-outline-danger"
                      title="Veure PDF (Annex I)"
                      :disabled="downloadingPlanId === plan.id"
                      @click="handleDownloadPlanPdf(plan)"
                    >
                      <span
                        v-if="downloadingPlanId === plan.id"
                        class="spinner-border spinner-border-sm"
                      ></span>
                      <i v-else class="bi bi-file-earmark-pdf-fill"></i>
                    </button>
                    <button
                      v-if="isPlanEditable(plan)"
                      class="btn btn-sm btn-outline-primary"
                      title="Editar pla"
                      @click="openEditModal(plan)"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      v-if="plan.status === 'pendent' || canDeleteNonPendingPlan"
                      class="btn btn-sm btn-outline-danger"
                      title="Eliminar pla"
                      :disabled="deletingPlanId === plan.id"
                      @click="handleDeletePlan(plan)"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      title="Duplicar pla (crea una còpia per al curs actual)"
                      :disabled="changingStatusPlanId === plan.id"
                      @click="handleCopyPlanToCurrentYear(plan)"
                    >
                      <i class="bi bi-files"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
:deep(#individualTrainingPlanModal .modal-dialog) {
  width: 80%;
  max-width: 80%;
  margin-left: auto;
  margin-right: auto;
}

.error-message-text {
  white-space: pre-line;
  font-size: 1.05rem;
  line-height: 1.5;
}

.pfi-summary-item {
  cursor: pointer;
  text-decoration: underline;
}
</style>
