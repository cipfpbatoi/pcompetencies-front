<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import * as yup from 'yup'
import { useDataStore } from '../stores/data'
import { api } from '../repositories/api.js'
import { useFormValidation } from '../composables/useFormValidation'
import { statusClass } from '../utils/utils.js'
import { isSaoExportActive, saoStatusClass, saoStatusLabel } from '../utils/sao.js'
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
// directament el pla, però sols en mode vista: eixa pantalla és de revisió
// (aprovar/rebutjar), no d'edició del contingut del pla
const route = useRoute()
const router = useRouter()

onMounted(() => {
  const openPlanId = route.query.openPlanId ? Number(route.query.openPlanId) : null
  if (!openPlanId) return

  const plan = plans.value.find((item) => item.id === openPlanId)
  if (plan) {
    openViewModal(plan)
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

// El pla ja porta totalHours calculat al backend; si no hi és (resposta antiga/incompleta),
// es calcula a partir de moduleHours[] com a reforç
const getPlanTotalHours = (plan) =>
  plan.totalHours ?? (plan.moduleHours || []).reduce((sum, entry) => sum + (entry.hours || 0), 0)

const availableTurns = computed(() => cycle.value?.availableTurns || [])

const isOptionalModule = (moduleCode) => String(moduleCode || '').startsWith('CVOP')

const isModuleAvailableForTurn = (moduleCode) => {
  if (!isOptionalModule(moduleCode)) return true

  const optionalTurns = pcc.value?.moduleOrganizations?.find(
    (organization) => organization.module?.code === moduleCode
  )?.optionalTurns

  return !Array.isArray(optionalTurns) || optionalTurns.length === 0 || optionalTurns.includes(form.turn)
}

// ==========================================
// MODAL: CREAR/EDITAR PLA
// ==========================================
const planFormModalRef = ref(null)
const isSaving = ref(false)
const isLoadingItems = ref(false)
const editingPlanId = ref(null)
const isViewOnly = ref(false)
const modules = ref([])
const selectionErrorLines = ref([])
const currentStep = ref(1)
const activeModuleCode = ref('')
const previousTurn = ref('')
const showCoordinationMechanismsHelp = ref(false)
const showVisitPeriodicityHelp = ref(false)
const showTrainingPeriodsHelp = ref(false)
const showExtraordinaryAuthorizationsHelp = ref(false)
const showObservationsHelp = ref(false)
const showPeriodValidationErrors = ref(false)

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
  coordinationMechanisms: '',
  visitPeriodicity: '',
  requiresExtraordinaryAuthorizations: false,
  extraordinaryAuthorizations: '',
  moduleHours: {},
  moduleActivities: {},
  periods: []
})

const createEmptyPeriod = () => ({ startDate: '', endDate: '', hours: null, company: '' })

// L'input type="date" sols accepta "AAAA-MM-DD": si el backend torna un datetime
// complet (p. ex. "2026-01-15T00:00:00+00:00") cal retallar-lo o el camp es veu buit
const toDateInputValue = (value) => (value ? String(value).slice(0, 10) : '')

const addPeriod = () => {
  form.periods.push(createEmptyPeriod())
}

const removePeriod = (index) => {
  form.periods.splice(index, 1)
}

// Curs escolar del pla (p. ex. "2025-2026"): per a un pla nou és el curs actual, per a
// un pla existent és el que ja tenia. S'usa per a acotar les dates dels períodes
const planCourseYear = ref('')

// No hi ha dates de curs al backend: s'asumeix l'any acadèmic estàndard, de l'1 de
// setembre de l'any d'inici fins al 31 d'agost de l'any de fi
const getSchoolYearBounds = (courseYear) => {
  const match = /^(\d{4})-(\d{4})$/.exec(courseYear || '')
  if (!match) return null
  const [, startYear, endYear] = match
  return { min: `${startYear}-09-01`, max: `${endYear}-08-31` }
}

const schoolYearBounds = computed(() => getSchoolYearBounds(planCourseYear.value))

// Suma de les hores de tots els períodes: ha de coincidir amb el total d'hores del pla
// (comprovació real pendent per al moment d'enviar la programació; de moment sols avís)
const totalPeriodsHours = computed(() =>
  form.periods.reduce((sum, period) => sum + (Number(period.hours) || 0), 0)
)

const periodsHoursMismatch = computed(
  () => form.periods.length > 0 && totalPeriodsHours.value !== totalModuleHours.value
)

const periodsMissingCompany = computed(() => form.periods.some((period) => !period.company.trim()))

// Períodes amb alguna data fora del curs escolar del pla (comprovació real pendent
// per al moment d'enviar la programació; de moment sols avís)
const periodsOutOfSchoolYear = computed(() => {
  if (!schoolYearBounds.value) return false
  const { min, max } = schoolYearBounds.value
  return form.periods.some(
    (period) =>
      (period.startDate && (period.startDate < min || period.startDate > max)) ||
      (period.endDate && (period.endDate < min || period.endDate > max))
  )
})

// Períodes que se solapen entre ells (comparació de cadenes "AAAA-MM-DD", vàlida
// cronològicament); de moment sols avís
const periodsOverlap = computed(() => {
  const withDates = form.periods.filter((period) => period.startDate && period.endDate)
  return withDates.some((period, index) =>
    withDates.some(
      (other, otherIndex) =>
        otherIndex > index && period.startDate <= other.endDate && other.startDate <= period.endDate
    )
  )
})

// El pas 3 es pot deixar incomplet en guardar (per a poder fer el pla en varis
// passos), però cal avisar que no es podrà enviar la programació fins completar-lo
const step3Incomplete = computed(() => {
  if (!form.coordinationMechanisms.trim() || !form.visitPeriodicity.trim()) return true
  if (form.periods.length === 0) return true
  return form.periods.some(
    (period) =>
      !period.startDate ||
      !period.endDate ||
      !(Number(period.hours) > 0) ||
      !period.company.trim()
  )
})

const selectedLearningResultIds = ref(new Set())
const selectedEvaluationCriteriaIds = ref(new Set())
const learningResultDevelopments = ref({})
const LEARNING_RESULT_DEVELOPMENTS = ['inferido', 'empresa', 'compartido']

const normalizeLearningResultDevelopment = (development) =>
  LEARNING_RESULT_DEVELOPMENTS.includes(development) ? development : 'inferido'

const setLearningResultDevelopment = (learningResultId, development) => {
  learningResultDevelopments.value = {
    ...learningResultDevelopments.value,
    [learningResultId]: normalizeLearningResultDevelopment(development)
  }
}

const removeLearningResultDevelopment = (learningResultId) => {
  const next = { ...learningResultDevelopments.value }
  delete next[learningResultId]
  learningResultDevelopments.value = next
}

const getLearningResultDevelopmentLabel = (learningResult) => {
  const development = normalizeLearningResultDevelopment(learningResultDevelopments.value[learningResult.id])
  if (development === 'empresa') return 'Soles empresa'
  if (development === 'compartido') return 'Empresa + Centre'
  return learningResult.coverage === 'complete' ? 'Soles empresa' : 'Empresa + Centre'
}

const getLearningResultDevelopmentClass = (learningResult) => {
  const development = normalizeLearningResultDevelopment(learningResultDevelopments.value[learningResult.id])
  if (development === 'empresa') return 'bg-success'
  if (development === 'compartido') return 'bg-secondary'
  return learningResult.coverage === 'complete' ? 'bg-success' : 'bg-secondary'
}

const getLearningResultDevelopmentTitle = (learningResult) => {
  const development = normalizeLearningResultDevelopment(learningResultDevelopments.value[learningResult.id])
  if (development === 'empresa') return 'Este RA es desenvolupa sols en empresa'
  if (development === 'compartido') return 'Este RA es desenvolupa en empresa i en el centre'
  return learningResult.coverage === 'complete'
    ? 'Este RA només es treballa en la situació en empresa: es cobreix sencer'
    : "Este RA també es treballa en altres situacions d'aprenentatge: sols es cobreix en part"
}

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

const stepLabel = computed(() => {
  if (currentStep.value === 1) return 'Pas 1: Dades bàsiques'
  if (currentStep.value === 2) return 'Pas 2: RA, criteris i hores'
  return 'Pas 3: Coordinació i seguiment'
})

const modalTitle = computed(() => {
  if (isViewOnly.value) return 'Veure pla formatiu individual'
  const base = isEditing.value ? 'Editar pla formatiu individual' : 'Nou pla formatiu individual'
  return `${base} — ${stepLabel.value}`
})

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
    coordinationMechanisms: form.coordinationMechanisms,
    visitPeriodicity: form.visitPeriodicity,
    requiresExtraordinaryAuthorizations: form.requiresExtraordinaryAuthorizations,
    extraordinaryAuthorizations: form.extraordinaryAuthorizations,
    learningResultIds: [...selectedLearningResultIds.value].sort((a, b) => a - b),
    learningResultDevelopments: Object.fromEntries(
      [...selectedLearningResultIds.value]
        .sort((a, b) => a - b)
        .map((id) => [id, normalizeLearningResultDevelopment(learningResultDevelopments.value[id])])
    ),
    evaluationCriteriaIds: [...selectedEvaluationCriteriaIds.value].sort((a, b) => a - b),
    moduleHours: relevantModuleHoursEntries.value,
    moduleActivities: relevantModuleActivitiesEntries.value,
    periods: form.periods
  })

const markSnapshotAsSaved = () => {
  savedSnapshot.value = buildFormSnapshot()
}

const isDirty = computed(() => buildFormSnapshot() !== savedSnapshot.value)

const getModuleCourseLevel = (moduleCode) => {
  const module =
    cycle.value?.modules?.find((item) => item.code === moduleCode) ||
    modules.value.find((item) => item.moduleCode === moduleCode)
  return module?.courseLevel === 2 ? 2 : 1
}

// Un pla de 1r pot incloure mòduls d'1r i de 2n; un pla de 2n només pot incloure mòduls de 2n
const isModuleCourseAllowed = (moduleCourseLevel, planCourseLevel) => {
  if (form.turn === 'half-presential') return true
  return moduleCourseLevel === planCourseLevel || (planCourseLevel === 1 && moduleCourseLevel === 2)
}

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

const isActiveModuleUnavailable = computed(
  () => !!activeModule.value && !isModuleAvailableForTurn(activeModule.value.moduleCode)
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
      label: String(entry.lr.number),
      type: 'learningResult',
      learningResultId: entry.lr.id,
      lrNumber: entry.lr.number,
      // Les entrades de RA sencer van abans que els seus criteris individuals
      order: 0,
      remove: () => toggleLearningResult(entry.lr)
    })
  })
  selectedEvaluationCriteriaIds.value.forEach((id) => {
    const entry = evaluationCriteriaIndex.value.get(id)
    if (!entry) return
    addItem(entry.mod.moduleCode, entry.mod.moduleName, {
      key: `ce-${id}`,
      type: 'evaluationCriteria',
      learningResultId: entry.lr.id,
      learningResultLabel: String(entry.lr.number),
      code: entry.ce.code,
      lrNumber: entry.lr.number,
      order: 1,
      remove: () => toggleEvaluationCriteria(entry.ce)
    })
  })

  byModule.forEach((entry) => {
    const criteriaByLearningResult = new Map()
    entry.items
      .filter((item) => item.type === 'evaluationCriteria')
      .forEach((item) => {
        if (!criteriaByLearningResult.has(item.learningResultId)) {
          criteriaByLearningResult.set(item.learningResultId, {
            key: `criteria-${item.learningResultId}`,
            label: item.learningResultLabel,
            lrNumber: item.lrNumber,
            order: item.order,
            criteria: []
          })
        }
        criteriaByLearningResult.get(item.learningResultId).criteria.push(item)
      })

    criteriaByLearningResult.forEach((item) => {
      item.criteria.sort((a, b) => a.code.localeCompare(b.code))
    })
    entry.items = [
      // Si un RA complet té criteris seleccionats, el resum els mostra agrupats en lloc de repetir
      // el número del RA i els seus criteris.
      ...entry.items.filter(
        (item) => item.type === 'learningResult' && !criteriaByLearningResult.has(item.learningResultId)
      ),
      ...criteriaByLearningResult.values()
    ]
    entry.items.sort(
      (a, b) => a.lrNumber - b.lrNumber || a.order - b.order || a.label.localeCompare(b.label)
    )
  })

  return [...byModule.values()]
})

const modulesWithSelectionCodes = computed(
  () => new Set(selectedSummaryByModule.value.map((entry) => entry.moduleCode))
)

// Mode vista: en lloc del selector de mòdul, es mostren directament tots els mòduls
// amb selecció, i de cada un només els RA/CE seleccionats (no tot el catàleg)
const viewSummaryModules = computed(() => {
  if (!isViewOnly.value) return []
  return modules.value
    .filter((mod) => modulesWithSelectionCodes.value.has(mod.moduleCode))
    .map((mod) => ({
      ...mod,
      learningResults: mod.learningResults
        .filter(
          (lr) =>
            selectedLearningResultIds.value.has(lr.id) ||
            lr.evaluationCriterias.some((ce) => selectedEvaluationCriteriaIds.value.has(ce.id))
        )
        .map((lr) => ({
          ...lr,
          evaluationCriterias: selectedLearningResultIds.value.has(lr.id)
            ? lr.evaluationCriterias
            : lr.evaluationCriterias.filter((ce) => selectedEvaluationCriteriaIds.value.has(ce.id))
        }))
    }))
})

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

// Activitats (text lliure, opcional) per a cada mòdul amb algun RA/CE seleccionat
const relevantModuleActivitiesEntries = computed(() =>
  selectedSummaryByModule.value
    .map((entry) => [entry.moduleCode, form.moduleActivities[entry.moduleCode] || ''])
    .sort((a, b) => a[0].localeCompare(b[0]))
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
  learningResultDevelopments.value = Object.fromEntries(
    [...selectedLearningResultIds.value].map((id) => [
      id,
      normalizeLearningResultDevelopment(learningResultDevelopments.value[id])
    ])
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
    learningResultDevelopments.value = Object.fromEntries(
      data
        .flatMap((mod) => mod.learningResults)
        .filter((lr) => lr.selected)
        .map((lr) => [lr.id, normalizeLearningResultDevelopment(lr.development)])
    )
  } else {
    selectedLearningResultIds.value = new Set(
      [...selectedLearningResultIds.value].filter((id) => validLrIds.has(id))
    )
    selectedEvaluationCriteriaIds.value = new Set(
      [...selectedEvaluationCriteriaIds.value].filter((id) => validCeIds.has(id))
    )
    learningResultDevelopments.value = Object.fromEntries(
      [...selectedLearningResultIds.value].map((id) => [
        id,
        normalizeLearningResultDevelopment(learningResultDevelopments.value[id])
      ])
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

const handleTurnChange = async () => {
  const changingToPresentialSecondCourse =
    previousTurn.value === 'half-presential' &&
    form.turn === 'presential' &&
    Number(form.courseLevel) === 2

  if (changingToPresentialSecondCourse) {
    const firstCourseModuleCodes = new Set(
      modules.value
        .filter((module) => getModuleCourseLevel(module.moduleCode) === 1)
        .map((module) => module.moduleCode)
    )
    const learningResultIdsToRemove = [...selectedLearningResultIds.value].filter((id) => {
      const entry = learningResultIndex.value.get(id)
      return entry && firstCourseModuleCodes.has(entry.mod.moduleCode)
    })
    const evaluationCriteriaIdsToRemove = [...selectedEvaluationCriteriaIds.value].filter((id) => {
      const entry = evaluationCriteriaIndex.value.get(id)
      return entry && firstCourseModuleCodes.has(entry.mod.moduleCode)
    })

    if (learningResultIdsToRemove.length || evaluationCriteriaIdsToRemove.length) {
      selectedLearningResultIds.value = new Set(
        [...selectedLearningResultIds.value].filter((id) => !learningResultIdsToRemove.includes(id))
      )
      selectedEvaluationCriteriaIds.value = new Set(
        [...selectedEvaluationCriteriaIds.value].filter((id) => !evaluationCriteriaIdsToRemove.includes(id))
      )
      learningResultIdsToRemove.forEach(removeLearningResultDevelopment)
    }

    firstCourseModuleCodes.forEach((moduleCode) => {
      delete form.moduleHours[moduleCode]
      delete form.moduleActivities[moduleCode]
    })

    if (learningResultIdsToRemove.length || evaluationCriteriaIdsToRemove.length) {
      addMessage(
        'info',
        "S'han retirat elements de 1r perquè no són compatibles amb un pla presencial de 2n"
      )
    }
  }

  previousTurn.value = form.turn
  await loadAvailableItems({ keepServerSelection: false })

  const unavailableModuleCodes = selectedSummaryByModule.value
    .filter((entry) => !isModuleAvailableForTurn(entry.moduleCode))
    .map((entry) => entry.moduleCode)

  unavailableModuleCodes.forEach(removeModuleSelection)
  if (unavailableModuleCodes.length > 0) {
    addMessage('info', "S'han retirat les seleccions d'optatives no disponibles en el torn triat")
  }
}

const openCreateModal = async () => {
  editingPlanId.value = null
  isViewOnly.value = false
  form.name = ''
  form.turn = availableTurns.value[0] || ''
  form.courseLevel = ''
  form.observations = ''
  form.coordinationMechanisms = ''
  form.visitPeriodicity = ''
  form.requiresExtraordinaryAuthorizations = false
  form.extraordinaryAuthorizations = ''
  form.moduleHours = {}
  form.moduleActivities = {}
  form.periods = []
  planCourseYear.value = currentSchoolYear.value
  previousTurn.value = form.turn
  selectedLearningResultIds.value = new Set()
  selectedEvaluationCriteriaIds.value = new Set()
  learningResultDevelopments.value = {}
  selectionErrorLines.value = []
  currentStep.value = 1
  activeModuleCode.value = ''
  showCoordinationMechanismsHelp.value = false
  showVisitPeriodicityHelp.value = false
  showTrainingPeriodsHelp.value = false
  showExtraordinaryAuthorizationsHelp.value = false
  showObservationsHelp.value = false
  showPeriodValidationErrors.value = false
  clearErrors()
  planFormModalRef.value?.show()
  await loadAvailableItems()
  markSnapshotAsSaved()
}

const populateFormFromPlan = (plan) => {
  form.name = plan.name
  form.turn = plan.turn
  form.courseLevel = plan.courseLevel
  form.observations = plan.observations || ''
  form.coordinationMechanisms = plan.coordinationMechanisms || ''
  form.visitPeriodicity = plan.visitPeriodicity || ''
  form.requiresExtraordinaryAuthorizations = !!plan.requiresExtraordinaryAuthorizations
  form.extraordinaryAuthorizations = plan.extraordinaryAuthorizations || ''
  form.moduleHours = Object.fromEntries(
    (plan.moduleHours || [])
      .filter((entry) => entry.module?.code)
      .map((entry) => [entry.module.code, entry.hours])
  )
  form.moduleActivities = Object.fromEntries(
    (plan.moduleHours || [])
      .filter((entry) => entry.module?.code)
      .map((entry) => [entry.module.code, entry.activities || ''])
  )
  form.periods = (plan.periods || []).map((period) => ({
    startDate: toDateInputValue(period.startDate),
    endDate: toDateInputValue(period.endDate),
    hours: period.hours ?? null,
    company: period.company || ''
  }))
  planCourseYear.value = plan.courseYear || currentSchoolYear.value
  previousTurn.value = form.turn
}

const openEditModal = async (plan, { viewOnly = false } = {}) => {
  editingPlanId.value = plan.id
  isViewOnly.value = viewOnly
  // Primer es mostra amb les dades que ja teníem (llistat del PCC), per a obrir el
  // modal a l'instant; després es recarrega el detall complet del pla, ja que el
  // llistat pot no portar tots els camps (p. ex. coordinationMechanisms, periods...)
  populateFormFromPlan(plan)
  selectionErrorLines.value = []
  currentStep.value = 1
  activeModuleCode.value = ''
  showCoordinationMechanismsHelp.value = false
  showVisitPeriodicityHelp.value = false
  showTrainingPeriodsHelp.value = false
  showExtraordinaryAuthorizationsHelp.value = false
  showObservationsHelp.value = false
  showPeriodValidationErrors.value = false
  clearErrors()
  planFormModalRef.value?.show()

  const detailPromise = api.getIndividualTrainingPlan(props.pccId, plan.id).catch((error) => {
    addMessage('error', error)
    return null
  })

  const [, detailResponse] = await Promise.all([
    loadAvailableItems({ keepServerSelection: true }),
    detailPromise
  ])

  if (detailResponse) {
    populateFormFromPlan(detailResponse.data)
  }

  markSnapshotAsSaved()
}

// Veure un pla sense poder editar-lo: reutilitza la càrrega de l'edició però en mode lectura
const openViewModal = (plan) => openEditModal(plan, { viewOnly: true })

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
  if (isActiveModuleUnavailable.value) return

  const next = new Set(selectedLearningResultIds.value)
  if (next.has(learningResult.id)) {
    next.delete(learningResult.id)
    removeLearningResultDevelopment(learningResult.id)
    // En desmarcar el RA, es desactiven i es netegen els seus criteris
    const nextCe = new Set(selectedEvaluationCriteriaIds.value)
    learningResult.evaluationCriterias.forEach((ce) => nextCe.delete(ce.id))
    selectedEvaluationCriteriaIds.value = nextCe
  } else {
    next.add(learningResult.id)
    setLearningResultDevelopment(
      learningResult.id,
      learningResultDevelopments.value[learningResult.id]
    )
    ensureSuggestedHours(activeModuleCode.value)
  }
  selectedLearningResultIds.value = next
}

const toggleEvaluationCriteria = (evaluationCriteria) => {
  if (isActiveModuleUnavailable.value) return

  const next = new Set(selectedEvaluationCriteriaIds.value)
  if (next.has(evaluationCriteria.id)) {
    next.delete(evaluationCriteria.id)
  } else {
    next.add(evaluationCriteria.id)
    ensureSuggestedHours(activeModuleCode.value)
  }
  selectedEvaluationCriteriaIds.value = next
}

const removeModuleSelection = (moduleCode) => {
  const module = modules.value.find((item) => item.moduleCode === moduleCode)
  const learningResultIds = module?.learningResults.map((learningResult) => learningResult.id) || []
  const learningResultIdSet = new Set(learningResultIds)
  const evaluationCriteriaIds = new Set(
    module?.learningResults.flatMap((learningResult) =>
      learningResult.evaluationCriterias.map((evaluationCriteria) => evaluationCriteria.id)
    ) || []
  )

  selectedLearningResultIds.value = new Set(
    [...selectedLearningResultIds.value].filter((id) => !learningResultIdSet.has(id))
  )
  selectedEvaluationCriteriaIds.value = new Set(
    [...selectedEvaluationCriteriaIds.value].filter((id) => !evaluationCriteriaIds.has(id))
  )
  learningResultIds.forEach(removeLearningResultDevelopment)
  delete form.moduleHours[moduleCode]
  delete form.moduleActivities[moduleCode]

  if (activeModuleCode.value === moduleCode) {
    activeModuleCode.value = ''
  }
}

const selectAllCriteriaForLr = (learningResult) => {
  if (isActiveModuleUnavailable.value) return

  const nextCe = new Set(selectedEvaluationCriteriaIds.value)
  learningResult.evaluationCriterias.forEach((ce) => nextCe.add(ce.id))
  selectedEvaluationCriteriaIds.value = nextCe

  if (
    learningResult.allCriteriaEligible &&
    !selectedLearningResultIds.value.has(learningResult.id)
  ) {
    const nextLr = new Set(selectedLearningResultIds.value)
    nextLr.add(learningResult.id)
    selectedLearningResultIds.value = nextLr
    setLearningResultDevelopment(
      learningResult.id,
      learningResultDevelopments.value[learningResult.id]
    )
  }

  ensureSuggestedHours(activeModuleCode.value)
}

// Comprova la selecció de RA/CE i les hores per mòdul (pas 2); s'usa tant per a avançar
// al pas 3 com com a xarxa de seguretat abans de guardar
const validateSelection = () => {
  if (selectedCount.value === 0) {
    selectionErrorLines.value = [
      "Cal seleccionar almenys un resultat d'aprenentatge o criteri d'avaluació"
    ]
    scrollModalToTop()
    return false
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
    return false
  }
  const modulesMissingHours = selectedSummaryByModule.value.filter(
    (entry) => !(Number(form.moduleHours[entry.moduleCode]) > 0)
  )

  if (modulesMissingHours.length > 0) {
    selectionErrorLines.value = modulesMissingHours.map(
      (entry) => `${entry.moduleName}: cal indicar les hores en empresa d'este mòdul`
    )
    scrollModalToTop()
    return false
  }

  selectionErrorLines.value = []
  return true
}

const goToStep3 = () => {
  if (!validateSelection()) {
    currentStep.value = 2
    return
  }
  currentStep.value = 3
}

const goBackToStep2 = () => {
  currentStep.value = 2
}

// Navegació directa en clicar una etiqueta del indicador de pas: cap arrere sempre es
// permet, cap avant cal validar cada pas intermedi (reutilitzant la mateixa lògica
// que els botons Següent)
const goToStep = async (target) => {
  if (target === currentStep.value) return
  if (target < currentStep.value) {
    currentStep.value = target
    return
  }
  if (currentStep.value === 1) {
    await goToStep2()
    if (currentStep.value !== 2) return
  }
  if (target === 3 && currentStep.value === 2) {
    goToStep3()
  }
}

const handleSavePlan = async () => {
  const isValid = await validate({
    name: form.name,
    turn: form.turn,
    courseLevel: form.courseLevel,
    requiresExtraordinaryAuthorizations: form.requiresExtraordinaryAuthorizations,
    extraordinaryAuthorizations: form.extraordinaryAuthorizations
  })
  if (!isValid) {
    currentStep.value = 1
    return
  }

  if (!validateSelection()) {
    currentStep.value = 2
    return
  }

  if (periodsMissingCompany.value) {
    showPeriodValidationErrors.value = true
    currentStep.value = 3
    scrollModalToTop()
    return
  }

  const learningResultDevelopmentsPayload = Object.fromEntries(
    [...selectedLearningResultIds.value]
      .filter((id) => normalizeLearningResultDevelopment(learningResultDevelopments.value[id]) !== 'inferido')
      .map((id) => [id, normalizeLearningResultDevelopment(learningResultDevelopments.value[id])])
  )
  const moduleHours = Object.fromEntries(relevantModuleHoursEntries.value)
  const moduleActivities = Object.fromEntries(
    relevantModuleActivitiesEntries.value.filter(([, activities]) => activities.trim() !== '')
  )
  // No es descarta cap període incomplet en guardar: perdre'n un sense avisar és pitjor que
  // conservar-lo perquè es complete després.
  const periods = form.periods.map((period) => ({
    startDate: period.startDate || null,
    endDate: period.endDate || null,
    hours: Number(period.hours) || 0,
    company: period.company.trim() || null
  }))

  const payload = {
    name: form.name.trim(),
    turn: form.turn,
    courseLevel: Number(form.courseLevel),
    observations: form.observations.trim() || null,
    coordinationMechanisms: form.coordinationMechanisms.trim() || null,
    visitPeriodicity: form.visitPeriodicity.trim() || null,
    requiresExtraordinaryAuthorizations: form.requiresExtraordinaryAuthorizations,
    extraordinaryAuthorizations: form.requiresExtraordinaryAuthorizations
      ? form.extraordinaryAuthorizations.trim() || null
      : null,
    learningResultIds: [...selectedLearningResultIds.value],
    learningResultDevelopments: learningResultDevelopmentsPayload,
    evaluationCriteriaIds: [...selectedEvaluationCriteriaIds.value],
    moduleHours,
    moduleActivities,
    periods
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
// EXPORTACIÓ A SAÓ
// ==========================================
const saoExports = ref({})
const saoExportingPlanId = ref(null)
const saoPollTimers = new Map()
const saoDetailsModalRef = ref(null)
const saoDetailsPlan = ref(null)

const getSaoExport = (plan) => saoExports.value[plan.id] || null
const getSaoStatus = (plan) => getSaoExport(plan)?.status || plan.saoExportStatus || null
const saoDetailsExport = computed(() =>
  saoDetailsPlan.value ? getSaoExport(saoDetailsPlan.value) : null
)
const canExportToSao = (plan) =>
  plan.status === 'aprovada' && isPlanOfCurrentSchoolYear(plan)

const getSaoActionTitle = (plan) => {
  const status = getSaoStatus(plan)
  if (['exported', 'exported_with_warnings'].includes(status)) {
    return 'La plantilla ja està sincronitzada amb SAÓ'
  }
  if (status === 'outdated') return 'Actualitzar les plantilles en SAÓ'
  if (['failed', 'partial_failure'].includes(status)) return 'Reintentar l’exportació a SAÓ'
  return 'Exportar les plantilles a SAÓ'
}

const rememberSaoExport = (plan, saoExport) => {
  saoExports.value = { ...saoExports.value, [plan.id]: saoExport }
  plan.saoExportStatus = saoExport.status
}

const clearSaoPoll = (planId) => {
  const timer = saoPollTimers.get(planId)
  if (timer === undefined) return
  window.clearInterval(timer)
  saoPollTimers.delete(planId)
}

const clearSaoPolls = () => {
  for (const planId of saoPollTimers.keys()) clearSaoPoll(planId)
}

const refreshSaoExport = async (plan, silent = false) => {
  try {
    const response = await api.getIndividualTrainingPlanSaoExport(props.pccId, plan.id)
    rememberSaoExport(plan, response.data)
    if (!isSaoExportActive(response.data.status)) clearSaoPoll(plan.id)
    return response.data
  } catch (error) {
    clearSaoPoll(plan.id)
    if (!silent) showActionError('No s’ha pogut consultar SAÓ', error)
    return null
  }
}

const startSaoPolling = (plan) => {
  clearSaoPoll(plan.id)
  saoPollTimers.set(plan.id, window.setInterval(() => refreshSaoExport(plan, true), 3000))
}

const handleSaoExport = async (plan) => {
  const status = getSaoStatus(plan)
  const action = ['failed', 'partial_failure'].includes(status)
    ? 'reintentar l’exportació de'
    : status
      ? 'actualitzar'
      : 'exportar'
  if (
    !confirm(
      `Vas a ${action} en SAÓ una plantilla per cada mòdul del pla "${plan.name}". Vols continuar?`
    )
  ) {
    return
  }

  saoExportingPlanId.value = plan.id
  try {
    const response = await api.exportIndividualTrainingPlanToSao(props.pccId, plan.id)
    rememberSaoExport(plan, response.data)
    if (isSaoExportActive(response.data.status)) startSaoPolling(plan)
    addMessage(
      'success',
      response.status === 202
        ? 'L’exportació a SAÓ ha quedat en cua'
        : 'Les plantilles ja estaven sincronitzades amb SAÓ'
    )
  } catch (error) {
    showActionError('No s’ha pogut iniciar l’exportació a SAÓ', error)
  } finally {
    saoExportingPlanId.value = null
  }
}

const openSaoDetails = async (plan) => {
  saoDetailsPlan.value = plan
  const result = await refreshSaoExport(plan)
  if (result) saoDetailsModalRef.value?.show()
}

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '')

onBeforeUnmount(clearSaoPolls)

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
      :show-save-button="!isViewOnly && currentStep === 3"
      save-button-text="Guarda"
      @save="handleSavePlan"
    >
      <template #header>
        <h1 id="individualTrainingPlanModalLabel" class="modal-title fs-5">
          {{ modalTitle }}
          <span v-if="isDirty && !isViewOnly" class="badge bg-warning text-dark ms-2">
            <i class="bi bi-exclamation-circle-fill"></i> Canvis sense guardar
          </span>
        </h1>
      </template>

      <!-- Indicador de pas: sols té sentit quan es crea/edita en 3 passos, no en mode vista.
           Cada etiqueta es pot clicar per a anar directament a eixe pas -->
      <div
        v-if="!isViewOnly"
        class="d-flex align-items-center justify-content-center gap-2 mb-3 py-2 rounded bg-light"
      >
        <span
          class="d-flex align-items-center gap-2 step-indicator-item"
          role="button"
          @click="goToStep(1)"
        >
          <span
            class="badge rounded-pill"
            :class="currentStep === 1 ? 'bg-primary' : 'bg-secondary'"
            >1</span
          >
          <span :class="currentStep === 1 ? 'fw-bold' : 'text-muted'">Dades bàsiques</span>
        </span>
        <i class="bi bi-arrow-right text-muted"></i>
        <span
          class="d-flex align-items-center gap-2 step-indicator-item"
          role="button"
          @click="goToStep(2)"
        >
          <span
            class="badge rounded-pill"
            :class="currentStep === 2 ? 'bg-primary' : 'bg-secondary'"
            >2</span
          >
          <span :class="currentStep === 2 ? 'fw-bold' : 'text-muted'">RA, criteris i hores</span>
        </span>
        <i class="bi bi-arrow-right text-muted"></i>
        <span
          class="d-flex align-items-center gap-2 step-indicator-item"
          role="button"
          @click="goToStep(3)"
        >
          <span
            class="badge rounded-pill"
            :class="currentStep === 3 ? 'bg-primary' : 'bg-secondary'"
            >3</span
          >
          <span :class="currentStep === 3 ? 'fw-bold' : 'text-muted'">Coordinació i seguiment</span>
        </span>
      </div>

      <!-- PAS 1: dades bàsiques -->
      <div v-if="isViewOnly || currentStep === 1" class="row g-3">
        <div class="col-12 col-md-6">
          <label class="form-label fw-bold">Nom del pla</label>
          <input
            v-model="form.name"
            type="text"
            class="form-control"
            placeholder="Ex: Pla PFI - Maria"
            :disabled="isViewOnly"
          />
          <p v-if="errors.name" class="text-danger small mb-0">{{ errors.name }}</p>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label fw-bold">Torn</label>
          <select
            v-model="form.turn"
            class="form-select"
            :disabled="isViewOnly"
            @change="handleTurnChange"
          >
            <option value="">-- Selecciona torn --</option>
            <option v-for="turn in availableTurns" :key="turn" :value="turn">
              {{ getTurnLabel(turn) }}
            </option>
          </select>
          <p v-if="errors.turn" class="text-danger small mb-0">{{ errors.turn }}</p>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label fw-bold">Curs</label>
          <select
            v-model="form.courseLevel"
            class="form-select"
            :disabled="isViewOnly"
            @change="handleCourseLevelChange"
          >
            <option value="">-- Selecciona curs --</option>
            <option :value="1">1r Curs</option>
            <option :value="2">2n Curs</option>
          </select>
          <p v-if="errors.courseLevel" class="text-danger small mb-0">{{ errors.courseLevel }}</p>
        </div>
        <div class="col-12">
          <div class="form-check">
            <input
              id="requiresExtraordinaryAuthorizations"
              v-model="form.requiresExtraordinaryAuthorizations"
              class="form-check-input"
              type="checkbox"
              :disabled="isViewOnly"
            />
            <label class="form-check-label fw-bold" for="requiresExtraordinaryAuthorizations">
              Requereix autoritzacions extraordinàries
            </label>
            <button
              type="button"
              class="btn btn-link text-primary p-0 border-0 lh-1 ms-1 align-text-bottom"
              title="Mostra informació i exemples"
              aria-label="Mostra informació i exemples de les autoritzacions extraordinàries"
              :aria-expanded="showExtraordinaryAuthorizationsHelp"
              aria-controls="extraordinaryAuthorizationsHelp"
              @click="showExtraordinaryAuthorizationsHelp = !showExtraordinaryAuthorizationsHelp"
            >
              <i class="bi bi-info-circle-fill fs-5"></i>
            </button>
          </div>
          <div
            v-if="showExtraordinaryAuthorizationsHelp"
            id="extraordinaryAuthorizationsHelp"
            class="alert alert-info py-2 px-3 small mt-2 mb-0"
          >
            <p class="mb-2">
              Marca esta opció quan la formació en empresa requerisca una autorització que excedisca
              les condicions ordinàries.
            </p>
            <p class="mb-2">
              Explica en el camp inferior quin és el motiu i l'autorització necessària.
            </p>
            <p class="mb-0">
              <strong>Exemples:</strong> realitzar la formació en dies festius o caps de setmana;
              fer l'estada en una empresa situada fora de l'entorn socioeconòmic del centre; o
              qualsevol altra situació excepcional que requerisca autorització.
            </p>
          </div>
          <div v-if="form.requiresExtraordinaryAuthorizations" class="mt-2">
            <label class="form-label fw-bold">Autoritzacions necessàries</label>
            <textarea
              v-model="form.extraordinaryAuthorizations"
              class="form-control"
              rows="2"
              placeholder="Descriu quines autoritzacions extraordinàries calen"
              :disabled="isViewOnly"
            ></textarea>
            <p v-if="errors.extraordinaryAuthorizations" class="text-danger small mb-0">
              {{ errors.extraordinaryAuthorizations }}
            </p>
          </div>
        </div>
        <div class="col-12">
          <div class="mb-2">
            <label for="observations" class="form-label fw-bold mb-0 d-inline">Observacions</label>
            <button
              type="button"
              class="btn btn-link text-primary p-0 border-0 lh-1 ms-1 align-text-bottom"
              title="Mostra informació i exemples"
              aria-label="Mostra informació i exemples de les observacions"
              :aria-expanded="showObservationsHelp"
              aria-controls="observationsHelp"
              @click="showObservationsHelp = !showObservationsHelp"
            >
              <i class="bi bi-info-circle-fill fs-5"></i>
            </button>
          </div>
          <div
            v-if="showObservationsHelp"
            id="observationsHelp"
            class="alert alert-info py-2 px-3 small"
          >
            Indica qualsevol aspecte rellevant que vulgues fer constar sobre el pla formatiu i que
            no haja quedat recollit en els apartats anteriors. Pots incloure aclariments,
            condicions específiques d'organització o qualsevol altra informació complementària
            relacionada amb la formació en empresa.
          </div>
          <textarea
            id="observations"
            v-model="form.observations"
            class="form-control"
            rows="2"
            :disabled="isViewOnly"
          ></textarea>
        </div>
      </div>

      <!-- PAS 2: RA, criteris i hores -->
      <template v-if="isViewOnly || currentStep === 2">
        <div v-if="selectionErrorLines.length" class="alert alert-danger py-2 px-3 mb-3">
          <div v-for="(line, index) in selectionErrorLines" :key="index">{{ line }}</div>
        </div>

        <div v-if="isLoadingItems" class="text-center py-4">
          <span class="spinner-border text-primary"></span>
        </div>
        <template v-else>
          <template v-if="isViewOnly">
            <h6 class="fw-bold">RA i criteris seleccionats</h6>
            <p v-if="viewSummaryModules.length === 0" class="alert alert-secondary mb-0">
              Este pla no té cap RA ni criteri seleccionat.
            </p>
            <div v-for="mod in viewSummaryModules" :key="mod.moduleCode" class="card mb-3">
              <div class="card-header bg-light fw-bold">
                {{ mod.moduleName }} ({{ mod.moduleCode }})
              </div>
              <ul class="list-group list-group-flush">
                <li v-for="lr in mod.learningResults" :key="lr.id" class="list-group-item">
                  <div class="row g-2 align-items-start">
                    <div class="col">
                      <div class="fw-bold mb-1">
                        <strong>RA{{ lr.number }}</strong> - {{ lr.descriptor }}
                        <span
                          v-if="selectedLearningResultIds.has(lr.id)"
                          class="badge bg-primary ms-1"
                          >Tot el RA</span
                        >
                      </div>
                      <ul v-if="lr.evaluationCriterias.length" class="mb-0 ps-4">
                        <li v-for="ce in lr.evaluationCriterias" :key="ce.id">
                          <strong>{{ ce.code }}</strong> - {{ ce.description }}
                        </li>
                      </ul>
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
          <template v-else>
            <h6 class="fw-bold">2.1 Afegir RA/CE d'un mòdul</h6>
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
                    }}{{ mod.moduleName }} ({{ mod.moduleCode }}){{
                      isModuleAvailableForTurn(mod.moduleCode) ? '' : ' - No disponible en este torn'
                    }}
                  </option>
                </optgroup>
                <optgroup v-if="allowedModulesByCourse[2].length" label="2n Curs">
                  <option
                    v-for="mod in allowedModulesByCourse[2]"
                    :key="mod.moduleCode"
                    :value="mod.moduleCode"
                  >
                    {{ modulesWithSelectionCodes.has(mod.moduleCode) ? '✓ ' : ''
                    }}{{ mod.moduleName }} ({{ mod.moduleCode }}){{
                      isModuleAvailableForTurn(mod.moduleCode) ? '' : ' - No disponible en este torn'
                    }}
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
                  <span v-if="isActiveModuleUnavailable" class="badge bg-secondary">
                    Optativa no disponible en este torn
                  </span>
                </div>
                <ul class="list-group list-group-flush">
                  <li
                    v-for="lr in activeModule.learningResults"
                    :key="lr.id"
                    class="list-group-item"
                  >
                    <div class="row g-2 align-items-start">
                      <div class="col">
                        <div
                          v-if="lr.allCriteriaEligible"
                          class="d-flex align-items-center justify-content-between mb-1"
                        >
                          <div class="form-check mb-0">
                            <input
                              :id="`lr-${lr.id}`"
                              class="form-check-input"
                              type="checkbox"
                              :checked="selectedLearningResultIds.has(lr.id)"
                              :disabled="isActiveModuleUnavailable"
                              @change="toggleLearningResult(lr)"
                            />
                            <label class="form-check-label fw-bold" :for="`lr-${lr.id}`">
                              <strong>RA{{ lr.number }}</strong> - {{ lr.descriptor }} (tot el RA)
                            </label>
                          </div>
                          <button
                            type="button"
                            class="btn btn-success btn-sm ms-2"
                            :disabled="isActiveModuleUnavailable"
                            @click="selectAllCriteriaForLr(lr)"
                          >
                            Seleccionar tots els criteris
                          </button>
                        </div>
                        <div v-else class="d-flex align-items-center justify-content-between mb-1">
                          <div class="fw-bold">
                            <strong>RA{{ lr.number }}</strong> - {{ lr.descriptor }}
                          </div>
                          <button
                            type="button"
                            class="btn btn-success btn-sm ms-2"
                            :disabled="isActiveModuleUnavailable"
                            @click="selectAllCriteriaForLr(lr)"
                          >
                            Seleccionar tots els criteris
                          </button>
                        </div>

                        <div
                          v-if="selectedLearningResultIds.has(lr.id)"
                          class="d-flex align-items-center gap-2 ms-3 mb-2 lr-development-control"
                        >
                          <label :for="`lr-development-${lr.id}`" class="small fw-bold mb-0">
                            Desenvolupament al centre
                          </label>
                          <select
                            :id="`lr-development-${lr.id}`"
                            class="form-select form-select-sm"
                            style="width: auto"
                            :value="normalizeLearningResultDevelopment(learningResultDevelopments[lr.id])"
                            :disabled="isActiveModuleUnavailable"
                            @change="setLearningResultDevelopment(lr.id, $event.target.value)"
                          >
                            <option value="inferido">Programació (Auto)</option>
                            <option value="empresa">empresa</option>
                            <option value="compartido">Compartit</option>
                          </select>
                          <span class="small text-muted">El RA es desenvolupa en:</span>
                          <span
                            class="badge lr-development-badge"
                            :class="getLearningResultDevelopmentClass(lr)"
                            :title="getLearningResultDevelopmentTitle(lr)"
                          >
                            {{ getLearningResultDevelopmentLabel(lr) }}
                          </span>
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
                              isActiveModuleUnavailable ||
                              (lr.allCriteriaEligible && !selectedLearningResultIds.has(lr.id))
                            "
                            @change="toggleEvaluationCriteria(ce)"
                          />
                          <label class="form-check-label" :for="`ce-${ce.id}`">
                            <strong>{{ ce.code }}</strong> - {{ ce.description }}
                          </label>
                        </div>
                      </div>

                    </div>
                  </li>
                </ul>
              </div>
            </template>
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
                      v-if="!item.criteria"
                      class="pfi-summary-item"
                      :role="isViewOnly ? undefined : 'button'"
                      :title="isViewOnly ? item.label : `Llevar ${item.label}`"
                      @click="isViewOnly ? null : item.remove()"
                      >{{ item.label }}</span
                      ><span v-else
                      ><span>{{ item.label }}</span
                      ><template v-for="(criterion, criterionIndex) in item.criteria" :key="criterion.key"
                        ><span
                          class="pfi-summary-item"
                          :role="isViewOnly ? undefined : 'button'"
                          :title="isViewOnly ? `${item.label}.${criterion.code}` : `Llevar ${item.label}.${criterion.code}`"
                          @click="isViewOnly ? null : criterion.remove()"
                          >{{ criterion.code }}</span
                        ><span v-if="criterionIndex < item.criteria.length - 1">,</span></template
                      ></span
                    ><span v-if="index < entry.items.length - 1">,&nbsp;</span></template
                  >
                  <button
                    v-if="!isViewOnly"
                    type="button"
                    class="btn btn-sm btn-link text-white p-0 ms-2 align-baseline"
                    title="Llevar mòdul del pla"
                    @click="removeModuleSelection(entry.moduleCode)"
                  >
                    <i class="bi bi-trash"></i>
                    <span class="visually-hidden">Llevar {{ entry.moduleName }}</span>
                  </button>
                </span>
              </div>

              <template v-if="selectedSummaryByModule.length > 0">
                <hr />
                <h6 class="fw-bold">Hores per mòduls i altres especificacions</h6>
                <div
                  v-for="entry in selectedSummaryByModule"
                  :key="entry.moduleCode"
                  class="mb-2 rounded px-3 py-2"
                  :class="getModuleSubtleClass(entry.moduleCode)"
                >
                  <div class="d-flex justify-content-between align-items-center gap-2">
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
                        :disabled="isViewOnly"
                      />
                      <span class="input-group-text">hores</span>
                    </div>
                  </div>
                  <textarea
                    v-model="form.moduleActivities[entry.moduleCode]"
                    class="form-control form-control-sm mt-2"
                    rows="2"
                    placeholder="(Opcional) Ací pots especificar qualssevol observació sobre les activitats a dessenvolupar a la empresa"
                    :disabled="isViewOnly"
                  ></textarea>
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

      <!-- PAS 3: coordinació i seguiment -->
      <div v-if="isViewOnly || currentStep === 3" class="row g-3">
        <div v-if="!isViewOnly && step3Incomplete" class="col-12">
          <div class="alert alert-warning py-2 px-3 mb-0">
            <i class="bi bi-exclamation-triangle-fill"></i>
            Pots guardar el pla encara que este pas estiga incomplet, però no podràs
            <strong>enviar-lo</strong> per a la seua aprovació fins que completes els mecanismes de
            coordinació, la periodicitat de les visites i almenys un període complet.
          </div>
        </div>
        <div class="col-12">
          <div class="mb-2">
            <label for="coordinationMechanisms" class="form-label fw-bold mb-0 d-inline"
              >3.1 Mecanismes de coordinació i seguiment durant el període de formació en
              empresa</label
            >
            <button
              type="button"
              class="btn btn-link text-primary p-0 border-0 lh-1 ms-1 align-text-bottom"
              title="Mostra informació i exemples"
              aria-label="Mostra informació i exemples dels mecanismes de coordinació i seguiment"
              :aria-expanded="showCoordinationMechanismsHelp"
              aria-controls="coordinationMechanismsHelp"
              @click="showCoordinationMechanismsHelp = !showCoordinationMechanismsHelp"
            >
              <i class="bi bi-info-circle-fill fs-5"></i>
            </button>
          </div>
          <div
            v-if="showCoordinationMechanismsHelp"
            id="coordinationMechanismsHelp"
            class="alert alert-info py-2 px-3 small"
          >
            <p class="mb-2">
              Explica com s'organitza la coordinació entre el centre i l'empresa: les persones
              responsables, les seues funcions i els canals de comunicació acordats per compartir
              informació o gestionar incidències.
            </p>
            <p class="mb-2">
              Pots usar canals com el correu electrònic corporatiu, el telèfon o Microsoft Teams.
            </p>
            <p class="mb-0">
              <strong>Exemple:</strong> «El tutor o la tutora docent serà la persona de contacte
              del centre i es coordinarà amb el tutor o la tutora d'empresa. La comunicació
              ordinària es farà per correu electrònic corporatiu i les incidències urgents per
              telèfon. Quan calga una reunió, es realitzarà per Microsoft Teams.»
            </p>
          </div>
          <textarea
            id="coordinationMechanisms"
            v-model="form.coordinationMechanisms"
            class="form-control"
            rows="3"
            placeholder="Ex: Reunions amb el tutor del centre de treball i el tutor docent"
            :disabled="isViewOnly"
          ></textarea>
        </div>
        <div class="col-12">
          <div class="mb-2">
            <label for="visitPeriodicity" class="form-label fw-bold mb-0 d-inline"
              >3.2 Periodicitat de les visites: Visites a les empreses, comunicació telefònica:
              dates i duració, comunicació per correu electrònic, videotelefonades: dates i
              duració.</label
            >
            <button
              type="button"
              class="btn btn-link text-primary p-0 border-0 lh-1 ms-1 align-text-bottom"
              title="Mostra informació i exemples"
              aria-label="Mostra informació i exemples de la periodicitat de les visites"
              :aria-expanded="showVisitPeriodicityHelp"
              aria-controls="visitPeriodicityHelp"
              @click="showVisitPeriodicityHelp = !showVisitPeriodicityHelp"
            >
              <i class="bi bi-info-circle-fill fs-5"></i>
            </button>
          </div>
          <div
            v-if="showVisitPeriodicityHelp"
            id="visitPeriodicityHelp"
            class="alert alert-info py-2 px-3 small"
          >
            <p class="mb-2">
              Detalla quan i amb quina freqüència es faran les visites presencials i les
              comunicacions de seguiment. Indica les dates o períodes previstos, el canal que
              s'utilitzarà i, quan corresponga, la duració aproximada.
            </p>
            <p class="mb-0">
              <strong>Exemple:</strong> «Visita inicial durant la primera setmana, una visita
              presencial mensual a l'empresa d'una hora i una visita final a l'empresa. Telefonada
              quinzenal amb el tutor o la tutora d'empresa i correu electrònic de seguiment cada
              divendres. Videotelefonada per Microsoft Teams en cas que siga necessari.»
            </p>
          </div>
          <textarea
            id="visitPeriodicity"
            v-model="form.visitPeriodicity"
            class="form-control"
            rows="3"
            :disabled="isViewOnly"
          ></textarea>
        </div>
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <label for="trainingPeriodStartDate" class="form-label fw-bold mb-0 d-inline"
                >3.3 Períodes de formació en empresa</label
              >
              <button
                type="button"
                class="btn btn-link text-primary p-0 border-0 lh-1 ms-1 align-text-bottom"
                title="Mostra informació i exemples"
                aria-label="Mostra informació i exemples dels períodes de formació en empresa"
                :aria-expanded="showTrainingPeriodsHelp"
                aria-controls="trainingPeriodsHelp"
                @click="showTrainingPeriodsHelp = !showTrainingPeriodsHelp"
              >
                <i class="bi bi-info-circle-fill fs-5"></i>
              </button>
            </div>
            <button
              v-if="!isViewOnly"
              type="button"
              class="btn btn-success btn-sm"
              @click="addPeriod"
            >
              <i class="bi bi-plus-circle"></i> Afegir període
            </button>
          </div>
          <div
            v-if="showTrainingPeriodsHelp"
            id="trainingPeriodsHelp"
            class="alert alert-info py-2 px-3 small"
          >
            <p class="mb-2">
              Pots afegir tants períodes com consideres necessaris. Al final, la suma de les hores
              de tots els períodes ha de coincidir amb el total d'hores incloses al pla de formació.
            </p>
            <p class="mb-2">
              En el camp <strong>Tipus d'empresa</strong>, indica el sector o tipus d'empresa al
              qual s'adreça el pla, no una empresa concreta.
            </p>
            <p class="mb-0">
              <strong>Exemples:</strong> perruqueries, hospitals privats, empreses de programació o
              departaments d'informàtica d'una empresa.
            </p>
          </div>
          <div v-if="periodsHoursMismatch" class="alert alert-warning py-2 px-3 mb-2">
            <i class="bi bi-exclamation-triangle-fill"></i>
            La suma de les hores dels períodes ({{ totalPeriodsHours }}h) no coincideix amb el total
            d'hores del pla ({{ totalModuleHours }}h).
          </div>
          <div v-if="periodsOutOfSchoolYear" class="alert alert-warning py-2 px-3 mb-2">
            <i class="bi bi-exclamation-triangle-fill"></i>
            Hi ha períodes amb dates fora del curs escolar del pla ({{ planCourseYear }}).
          </div>
          <div v-if="periodsOverlap" class="alert alert-warning py-2 px-3 mb-2">
            <i class="bi bi-exclamation-triangle-fill"></i>
            Hi ha períodes que se solapen entre ells.
          </div>
          <p v-if="form.periods.length === 0" class="text-muted small mb-0">
            Encara no has afegit cap període.
          </p>
          <div
            v-for="(period, index) in form.periods"
            :key="index"
            class="border rounded p-2 mb-2 bg-light"
          >
            <div class="fw-bold small text-muted mb-1">Període {{ index + 1 }}</div>
            <div class="row g-2 align-items-end">
              <div class="col-6 col-md-3">
                <label class="form-label small mb-1">Data inici</label>
                <input
                  v-model="period.startDate"
                  type="date"
                  class="form-control form-control-sm"
                  :min="schoolYearBounds?.min"
                  :max="schoolYearBounds?.max"
                  :disabled="isViewOnly"
                />
              </div>
              <div class="col-6 col-md-3">
                <label class="form-label small mb-1">Data fi</label>
                <input
                  v-model="period.endDate"
                  type="date"
                  class="form-control form-control-sm"
                  :min="schoolYearBounds?.min"
                  :max="schoolYearBounds?.max"
                  :disabled="isViewOnly"
                />
              </div>
              <div class="col-6 col-md-3">
                <label class="form-label small mb-1">Hores</label>
                <input
                  v-model.number="period.hours"
                  type="number"
                  min="0"
                  class="form-control form-control-sm"
                  :disabled="isViewOnly"
                />
              </div>
              <div v-if="!isViewOnly" class="col-6 col-md-3 text-end">
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm"
                  title="Llevar període"
                  @click="removePeriod(index)"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
            <div class="row g-2 mt-2">
              <div class="col-12">
                <label class="form-label small mb-1">Tipus d'empresa</label>
                <input
                  v-model="period.company"
                  type="text"
                  class="form-control form-control-sm"
                  :class="{ 'is-invalid': showPeriodValidationErrors && !period.company.trim() }"
                  placeholder="Ex: Empreses de programació, perruqueries, hospitals públics..."
                  required
                  :disabled="isViewOnly"
                />
                <div v-if="showPeriodValidationErrors && !period.company.trim()" class="invalid-feedback">
                  Cal indicar el tipus d'empresa.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template v-if="!isViewOnly" #footer-buttons>
        <button v-if="currentStep === 1" type="button" class="btn btn-primary" @click="goToStep2">
          Següent <i class="bi bi-arrow-right"></i>
        </button>
        <template v-else-if="currentStep === 2">
          <button type="button" class="btn btn-outline-secondary" @click="goToStep1">
            <i class="bi bi-arrow-left"></i> Enrere
          </button>
          <button type="button" class="btn btn-primary" @click="goToStep3">
            Següent <i class="bi bi-arrow-right"></i>
          </button>
        </template>
        <button v-else type="button" class="btn btn-outline-secondary" @click="goBackToStep2">
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

    <ModalComponent
      ref="saoDetailsModalRef"
      modal-id="saoExportDetailsModalPcc"
      title="Exportació a SAÓ"
      size="lg"
      scrollable
      :show-save-button="false"
      close-button-text="Tanca"
    >
      <template v-if="saoDetailsExport">
        <div class="d-flex align-items-center gap-2 mb-3">
          <strong>{{ saoDetailsPlan?.name }}</strong>
          <span class="badge" :class="saoStatusClass(saoDetailsExport.status)">
            {{ saoStatusLabel(saoDetailsExport.status) }}
          </span>
        </div>
        <div v-if="saoDetailsExport.errorMessage" class="alert alert-warning">
          {{ saoDetailsExport.errorMessage }}
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-bordered align-middle mb-0">
            <thead>
              <tr>
                <th>Mòdul</th>
                <th>Descripció</th>
                <th>Estat</th>
                <th>Resultat</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="moduleExport in saoDetailsExport.modules || []"
                :key="moduleExport.moduleCode"
              >
                <td>{{ moduleExport.moduleCode }}</td>
                <td>{{ moduleExport.description }}</td>
                <td>
                  <span class="badge" :class="saoStatusClass(moduleExport.status)">
                    {{ saoStatusLabel(moduleExport.status) }}
                  </span>
                </td>
                <td>
                  <div v-if="moduleExport.errorMessage" class="text-danger mb-1">
                    {{ moduleExport.errorMessage }}
                  </div>
                  <div v-if="moduleExport.issues?.length">
                    <ul class="mb-1 ps-3">
                      <li
                        v-for="(issue, index) in moduleExport.issues"
                        :key="`${issue.code}-${issue.action}-${index}`"
                      >
                        <span class="badge bg-warning text-dark me-1">
                          {{ issue.action === 'assigned' ? 'Assignada amb avís' : 'Omesa' }}
                        </span>
                        {{ issue.message }}
                      </li>
                    </ul>
                    <small v-if="moduleExport.exportedAt" class="text-secondary">
                      Exportat {{ formatDateTime(moduleExport.exportedAt) }}
                    </small>
                  </div>
                  <span
                    v-else-if="!moduleExport.errorMessage && moduleExport.exportedAt"
                    class="text-success"
                  >
                    Exportat {{ formatDateTime(moduleExport.exportedAt) }}
                  </span>
                  <span v-else-if="!moduleExport.errorMessage" class="text-secondary">—</span>
                </td>
              </tr>
              <tr v-if="!(saoDetailsExport.modules || []).length">
                <td colspan="4" class="text-center text-secondary">
                  Encara no hi ha detall per mòduls.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </ModalComponent>

    <div class="d-flex justify-content-end mb-3">
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
              <th>SAÓ</th>
              <th>Mòduls</th>
              <th class="text-center">Total hores</th>
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
              <td>
                <button
                  v-if="getSaoStatus(plan)"
                  type="button"
                  class="badge border-0"
                  :class="saoStatusClass(getSaoStatus(plan))"
                  title="Veure el detall de l’exportació"
                  @click="openSaoDetails(plan)"
                >
                  <span
                    v-if="isSaoExportActive(getSaoStatus(plan))"
                    class="spinner-border spinner-border-sm me-1"
                    aria-hidden="true"
                  ></span>
                  {{ saoStatusLabel(getSaoStatus(plan)) }}
                </button>
                <span v-else class="text-secondary small">No exportat</span>
              </td>
              <td>{{ getPlanModulesLabel(plan) }}</td>
              <td class="text-center">{{ getPlanTotalHours(plan) }}h</td>
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
                    v-if="!isPlanEditable(plan)"
                    class="btn btn-sm btn-outline-secondary"
                    title="Veure pla"
                    @click="openViewModal(plan)"
                  >
                    <i class="bi bi-eye"></i>
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
                    v-if="
                      canExportToSao(plan) &&
                      !['exported', 'exported_with_warnings'].includes(getSaoStatus(plan))
                    "
                    data-testid="sao-export-button"
                    class="btn btn-sm btn-outline-primary"
                    :title="getSaoActionTitle(plan)"
                    :disabled="
                      saoExportingPlanId === plan.id || isSaoExportActive(getSaoStatus(plan))
                    "
                    @click="handleSaoExport(plan)"
                  >
                    <span
                      v-if="
                        saoExportingPlanId === plan.id || isSaoExportActive(getSaoStatus(plan))
                      "
                      class="spinner-border spinner-border-sm"
                    ></span>
                    <i v-else class="bi bi-cloud-arrow-up-fill"></i>
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
                <th>SAÓ</th>
                <th>Mòduls</th>
                <th class="text-center">Total hores</th>
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
                <td>
                  <button
                    v-if="getSaoStatus(plan)"
                    type="button"
                    class="badge border-0"
                    :class="saoStatusClass(getSaoStatus(plan))"
                    title="Veure el detall de l’exportació"
                    @click="openSaoDetails(plan)"
                  >
                    {{ saoStatusLabel(getSaoStatus(plan)) }}
                  </button>
                  <span v-else class="text-secondary small">No exportat</span>
                </td>
                <td>{{ getPlanModulesLabel(plan) }}</td>
                <td class="text-center">{{ getPlanTotalHours(plan) }}h</td>
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
                      v-if="!isPlanEditable(plan)"
                      class="btn btn-sm btn-outline-secondary"
                      title="Veure pla"
                      @click="openViewModal(plan)"
                    >
                      <i class="bi bi-eye"></i>
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

.lr-development-badge {
  border: 2px solid rgb(255 255 255 / 80%);
  box-shadow: 0 2px 4px rgb(0 0 0 / 25%);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 0.4rem 0.6rem;
  text-transform: uppercase;
}

.lr-development-control {
  background: var(--bs-primary-bg-subtle);
  border: 1px solid var(--bs-primary-border-subtle);
  border-left: 4px solid var(--bs-primary);
  border-radius: var(--bs-border-radius);
  padding: 0.45rem 0.65rem;
}

.step-indicator-item {
  cursor: pointer;
}
</style>
