<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/stores/data'

// Props
const props = defineProps({
  pccId: {
    type: Number,
    required: true
  },
  cycleId: {
    type: Number,
    required: true
  }
})

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)
const {
  loadCycleAssessmentTools,
  loadPCCAgreedAssessmentTools,
  savePCCAgreedAssessmentTool,
  deletePCCAgreedAssessmentTool
} = store

// Estado local
const availableTools = ref({
  mandatory: [],
  nonMandatory: []
})
const agreedTools = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const showEditModal = ref(false)
const editingTool = ref(null)
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)

const TURN_OPTIONS = [
  { value: 'presential', label: 'Presencial' },
  { value: 'half-presential', label: 'Semi-presencial' }
]

const DEFAULT_TURN = 'presential'

// Formulario
const form = ref({
  assessmentToolId: null,
  percentage: null,
  turns: [],
  moduleTurnSelections: []
})

const formErrors = ref({})
const applyToAllTurns = ref(true)
const applyToAllModules = ref(true)

// Computeds
const currentModules = computed(() => pcc.value?.modules || [])

const availableTurns = computed(() => {
  const cycleAvailableTurns = Array.isArray(pcc.value?.cycle?.availableTurns)
    ? pcc.value.cycle.availableTurns
    : []
  const cycleTurns = Array.isArray(pcc.value?.cycle?.turns) ? pcc.value.cycle.turns : []
  const moduleTurns = currentModules.value
    .map((module) => module.turn)
    .filter((turn) => typeof turn === 'string')

  const rawTurns = [...cycleAvailableTurns, ...cycleTurns, ...moduleTurns]
  const normalizedTurns = [...new Set(rawTurns)].filter((turn) =>
    TURN_OPTIONS.some((option) => option.value === turn)
  )

  if (normalizedTurns.length > 0) return normalizedTurns
  return [DEFAULT_TURN]
})

const availableTurnOptions = computed(() => {
  return TURN_OPTIONS.filter((option) => availableTurns.value.includes(option.value))
})

const effectiveTurnOptions = computed(() => {
  return TURN_OPTIONS.filter((option) => effectiveTurns.value.includes(option.value))
})

const hasMultipleTurns = computed(() => {
  return availableTurns.value.length > 1
})

const availableModules = computed(() => {
  const moduleMap = new Map()

  currentModules.value.forEach((module) => {
    if (!module?.code) return
    moduleMap.set(module.code, {
      code: module.code,
      name: module.name || module.code
    })
  })

  return Array.from(moduleMap.values()).sort((a, b) => a.code.localeCompare(b.code))
})

const effectiveTurns = computed(() => {
  if (!applyToAllModules.value) return availableTurns.value
  if (!hasMultipleTurns.value) return availableTurns.value
  if (applyToAllTurns.value) return availableTurns.value
  return form.value.turns.filter((turn) => availableTurns.value.includes(turn))
})

const mandatoryConfigured = computed(() => {
  if (availableTools.value.mandatory.length === 0) return false
  return availableTools.value.mandatory.every((tool) => hasAgreed(tool.assessmentTool.id))
})

const showMandatoryAlert = computed(() => {
  return !isLoading.value && availableTools.value.mandatory.length > 0 && !mandatoryConfigured.value
})

const mandatoryAdded = computed(() => {
  return availableTools.value.mandatory
    .filter((tool) => hasAgreed(tool.assessmentTool.id))
    .slice()
    .sort((a, b) => a.assessmentTool.name.localeCompare(b.assessmentTool.name))
})

const searchQuery = ref('')

const filterPendingByQuery = (tools) => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return tools
  return tools.filter((tool) => {
    const name = tool.assessmentTool?.name || tool.name
    const code = tool.assessmentTool?.code || tool.code
    return name.toLowerCase().includes(query) || code.toLowerCase().includes(query)
  })
}

const mandatoryPending = computed(() => {
  return filterPendingByQuery(
    availableTools.value.mandatory.filter((tool) => !hasAgreed(tool.assessmentTool.id))
  )
    .slice()
    .sort((a, b) => a.assessmentTool.name.localeCompare(b.assessmentTool.name))
})

const nonMandatoryAdded = computed(() => {
  return availableTools.value.nonMandatory
    .filter((tool) => hasAgreed(tool.id))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
})

const nonMandatoryPending = computed(() => {
  return filterPendingByQuery(
    availableTools.value.nonMandatory.filter((tool) => !hasAgreed(tool.id))
  )
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
})

const addedTools = computed(() => {
  const mandatory = mandatoryAdded.value.map((tool) => ({
    id: tool.assessmentTool.id,
    name: tool.assessmentTool.name,
    code: tool.assessmentTool.code,
    minPercentage: tool.minPercentage,
    isMandatory: true,
    original: tool
  }))
  const nonMandatory = nonMandatoryAdded.value.map((tool) => ({
    id: tool.id,
    name: tool.name,
    code: tool.code,
    minPercentage: tool.minPercentage,
    isMandatory: false,
    original: tool
  }))
  return [...mandatory, ...nonMandatory].sort((a, b) => {
    if (a.isMandatory !== b.isMandatory) return a.isMandatory ? -1 : 1
    return a.name.localeCompare(b.name)
  })
})

const findToolById = (assessmentToolId) => {
  const mandatory = availableTools.value.mandatory.find(
    (t) => t.assessmentTool.id === assessmentToolId
  )
  if (mandatory)
    return {
      ...mandatory.assessmentTool,
      minPercentage: mandatory.minPercentage,
      isMandatory: true
    }
  const nonMandatory = availableTools.value.nonMandatory.find((t) => t.id === assessmentToolId)
  if (nonMandatory) return { ...nonMandatory, isMandatory: false }
  return null
}

const isFormValid = computed(() => {
  if (!form.value.assessmentToolId) return false

  const tool = findToolById(form.value.assessmentToolId)
  if (!tool) return false

  // Validar porcentaje mínimo si existe
  if (tool.minPercentage && form.value.percentage !== null) {
    if (form.value.percentage < tool.minPercentage) return false
  }

  if (!editingTool.value?.isMandatory) {
    if (hasMultipleTurns.value && applyToAllModules.value) {
      if (!applyToAllTurns.value && form.value.turns.length === 0) return false
      if (!applyToAllTurns.value && form.value.turns.length >= availableTurns.value.length)
        return false

      const hasInvalidTurn = form.value.turns.some((turn) => !availableTurns.value.includes(turn))
      if (hasInvalidTurn) return false
    }

    if (!applyToAllModules.value) {
      if (form.value.moduleTurnSelections.length === 0) return false

      const availableModuleCodes = new Set(availableModules.value.map((module) => module.code))
      const uniquePairs = new Set()
      const uniqueModules = new Set()

      for (const selection of form.value.moduleTurnSelections) {
        if (!availableModuleCodes.has(selection.moduleCode)) return false
        if (!effectiveTurns.value.includes(selection.turn)) return false
        const pairKey = `${selection.moduleCode}::${selection.turn}`
        if (uniquePairs.has(pairKey)) return false
        uniquePairs.add(pairKey)
        uniqueModules.add(selection.moduleCode)
      }

      if (uniqueModules.size < 2) return false
    }
  }

  return true
})

const getAddedToolBadgeCount = (tool) => {
  let count = 1
  if (tool.isMandatory) count += 1
  if (tool.minPercentage) count += 1
  return count
}

const getMandatoryPendingBadgeCount = (tool) => {
  let count = 1
  if (tool.minPercentage) count += 1
  return count
}

const getNonMandatoryPendingBadgeCount = (tool) => {
  return tool.minPercentage ? 1 : 0
}

// Métodos
const loadData = async () => {
  isLoading.value = true
  try {
    availableTools.value = await loadCycleAssessmentTools(props.cycleId)
    agreedTools.value = await loadPCCAgreedAssessmentTools(props.pccId)
  } finally {
    isLoading.value = false
  }
}

const hasAgreed = (toolId) => {
  return agreedTools.value.some((a) => a.assessmentTool?.id === toolId)
}

const getAgreed = (toolId) => {
  return agreedTools.value.find((a) => a.assessmentTool?.id === toolId)
}

const getToolDescription = (tool) => {
  const description = tool?.assessmentTool?.description || tool?.description || ''

  return String(description).trim()
}

const getTurnLabel = (turn) => {
  return TURN_OPTIONS.find((option) => option.value === turn)?.label || turn
}

const getTurnShortLabel = (turn) => {
  if (turn === 'presential') return 'PRES.'
  if (turn === 'half-presential') return 'SEMI.'
  return turn
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

const buildModuleSummary = (agreed) => {
  const selections = normalizeModuleTurnSelections(agreed?.moduleTurnSelections)
  if (!selections.length) {
    const legacyModules = Array.isArray(agreed?.modules)
      ? agreed.modules.map((module) => module?.code).filter(Boolean)
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

const buildTurnSummary = (agreed) => {
  const selections = normalizeModuleTurnSelections(agreed?.moduleTurnSelections)
  if (selections.length > 0) {
    const turnsFromSelections = [
      ...new Set(selections.map((selection) => selection.turn).filter(Boolean))
    ]
    if (turnsFromSelections.length > 0) {
      return turnsFromSelections.map((turn) => getTurnLabel(turn)).join(', ')
    }
    return 'Segons selecció de mòduls'
  }

  const turns = Array.isArray(agreed?.turns) ? agreed.turns : []
  if (!turns.length) return 'Tots els torns'
  return turns.map((turn) => getTurnLabel(turn)).join(', ')
}

const shouldShowTurnSummary = (agreed) => {
  if (!hasMultipleTurns.value) return false
  const selections = normalizeModuleTurnSelections(agreed?.moduleTurnSelections)
  return selections.length === 0
}

const isTurnOptionDisabled = (turnValue) => {
  if (form.value.turns.includes(turnValue)) return false
  return form.value.turns.length >= availableTurnOptions.value.length - 1
}

const hasModuleTurnSelection = (moduleCode, turn) => {
  return form.value.moduleTurnSelections.some(
    (selection) => selection.moduleCode === moduleCode && selection.turn === turn
  )
}

const toggleModuleTurnSelection = (moduleCode, turn) => {
  const index = form.value.moduleTurnSelections.findIndex(
    (selection) => selection.moduleCode === moduleCode && selection.turn === turn
  )

  if (index > -1) {
    form.value.moduleTurnSelections.splice(index, 1)
    return
  }

  form.value.moduleTurnSelections.push({ moduleCode, turn })
}

const openEditModal = (tool) => {
  // For mandatory tools, assessmentTool is nested; for nonMandatory, it's flat
  const assessmentToolId = tool.assessmentTool ? tool.assessmentTool.id : tool.id
  const toolName = tool.assessmentTool ? tool.assessmentTool.name : tool.name
  const toolDescription = getToolDescription(tool)
  const minPct = tool.minPercentage || null
  const isMandatory = !!tool.assessmentTool

  editingTool.value = {
    id: assessmentToolId,
    name: toolName,
    description: toolDescription || '',
    minPercentage: minPct,
    isMandatory
  }

  const agreed = getAgreed(assessmentToolId)
  let agreedTurns = (Array.isArray(agreed?.turns) ? agreed.turns : []).filter((turn) =>
    availableTurns.value.includes(turn)
  )
  if (hasMultipleTurns.value && agreedTurns.length >= availableTurns.value.length) {
    agreedTurns = []
  }
  const agreedSelections = normalizeModuleTurnSelections(agreed?.moduleTurnSelections).filter(
    (selection) => {
      if (!availableTurns.value.includes(selection.turn)) return false
      if (agreedTurns.length === 0) return true
      return agreedTurns.includes(selection.turn)
    }
  )

  form.value = {
    assessmentToolId,
    percentage: agreed?.minimumPercentage ?? minPct ?? null,
    turns: isMandatory ? [] : agreedTurns,
    moduleTurnSelections: isMandatory ? [] : agreedSelections
  }

  if (!hasMultipleTurns.value) {
    form.value.turns = []
    const fallbackTurn = availableTurns.value[0] || ''
    form.value.moduleTurnSelections = form.value.moduleTurnSelections.map((selection) => ({
      ...selection,
      turn: selection.turn || fallbackTurn
    }))
  }

  applyToAllTurns.value = isMandatory || !hasMultipleTurns.value || form.value.turns.length === 0
  applyToAllModules.value = isMandatory || form.value.moduleTurnSelections.length === 0

  formErrors.value = {}
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingTool.value = null
  form.value = {
    assessmentToolId: null,
    percentage: null,
    turns: [],
    moduleTurnSelections: []
  }
  applyToAllTurns.value = true
  applyToAllModules.value = true
  formErrors.value = {}
}

const validateForm = () => {
  const errors = {}

  // Validar porcentaje mínimo
  if (editingTool.value?.minPercentage && form.value.percentage !== null) {
    if (form.value.percentage < editingTool.value.minPercentage) {
      errors.percentage = `El percentatge mínim és ${editingTool.value.minPercentage}%`
    }
  }

  if (!editingTool.value?.isMandatory) {
    if (hasMultipleTurns.value && applyToAllModules.value && !applyToAllTurns.value) {
      if (form.value.turns.length === 0) {
        errors.turns = 'Has de seleccionar almenys un torn'
      }
      if (form.value.turns.length >= availableTurns.value.length) {
        errors.turns = 'Si apliques a tots els torns, usa l\'opció "Tots els torns"'
      }
      const hasInvalidTurn = form.value.turns.some((turn) => !availableTurns.value.includes(turn))
      if (hasInvalidTurn) {
        errors.turns = 'Hi ha torns seleccionats que no estan disponibles en aquest cicle'
      }
    }

    if (!applyToAllModules.value) {
      const availableModuleCodes = new Set(availableModules.value.map((module) => module.code))
      const uniquePairs = new Set()
      const uniqueModules = new Set()

      form.value.moduleTurnSelections.forEach((selection) => {
        if (!availableModuleCodes.has(selection.moduleCode)) {
          errors.modules = 'Hi ha mòduls seleccionats que ja no estan disponibles'
        }

        if (!effectiveTurns.value.includes(selection.turn)) {
          errors.modules = 'Hi ha torns seleccionats que no estan disponibles'
        }

        const key = `${selection.moduleCode}::${selection.turn}`
        if (uniquePairs.has(key)) {
          errors.modules = 'No es poden repetir combinacions mòdul+torn'
        }
        uniquePairs.add(key)
        uniqueModules.add(selection.moduleCode)
      })

      if (form.value.moduleTurnSelections.length === 0) {
        errors.modules = 'Afig almenys una combinació de mòdul i torn'
      }

      if (uniqueModules.size > 0 && uniqueModules.size < 2) {
        errors.modules = 'Has de seleccionar almenys 2 mòduls diferents'
      }
    }
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const deleteTargetName = computed(() => {
  if (!deleteTarget.value) return 'aquest instrument'
  return deleteTarget.value.name || deleteTarget.value.assessmentTool?.name || 'aquest instrument'
})

const openDeleteConfirm = (tool) => {
  deleteTarget.value = tool
  showDeleteConfirm.value = true
}

const closeDeleteConfirm = () => {
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

const saveAgreed = async () => {
  if (!validateForm()) return

  isSaving.value = true
  try {
    const data = {
      assessmentToolId: form.value.assessmentToolId,
      minPercentage: form.value.percentage,
      turns:
        editingTool.value?.isMandatory ||
        !hasMultipleTurns.value ||
        !applyToAllModules.value ||
        applyToAllTurns.value
          ? []
          : form.value.turns,
      moduleTurnSelections:
        editingTool.value?.isMandatory || applyToAllModules.value
          ? []
          : form.value.moduleTurnSelections.map((selection) => ({
              moduleCode: selection.moduleCode,
              turn: selection.turn
            }))
    }

    const success = await savePCCAgreedAssessmentTool(props.pccId, data)
    if (success) {
      agreedTools.value = await loadPCCAgreedAssessmentTools(props.pccId)
      closeEditModal()
      store.addMessage('success', 'Instrument consensuat guardat')
    }
  } finally {
    isSaving.value = false
  }
}

watch(applyToAllTurns, (nextValue) => {
  if (nextValue) {
    form.value.turns = []
  }
})

watch(hasMultipleTurns, (nextValue) => {
  if (nextValue) return
  applyToAllTurns.value = true
  form.value.turns = []
})

watch(applyToAllModules, (nextValue) => {
  if (nextValue) {
    form.value.moduleTurnSelections = []
    return
  }

  applyToAllTurns.value = true
  form.value.turns = []
})

watch(
  effectiveTurns,
  (nextTurns) => {
    const availableModuleCodes = new Set(availableModules.value.map((module) => module.code))
    form.value.moduleTurnSelections = form.value.moduleTurnSelections.filter(
      (selection) =>
        availableModuleCodes.has(selection.moduleCode) &&
        selection.turn &&
        nextTurns.includes(selection.turn)
    )
  },
  { deep: true }
)

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  const toolId = deleteTarget.value.assessmentTool?.id || deleteTarget.value.id
  if (!toolId) return
  isSaving.value = true
  try {
    const success = await deletePCCAgreedAssessmentTool(props.pccId, toolId)
    if (success) {
      agreedTools.value = await loadPCCAgreedAssessmentTools(props.pccId)
      store.addMessage('success', 'Instrument eliminat')
      closeDeleteConfirm()
    }
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="pcc-assessment-tools">
    <div v-if="showMandatoryAlert" class="alert alert-danger mb-4">
      <i class="bi bi-exclamation-triangle-fill me-1"></i>
      <strong>Important:</strong> Els instruments obligatoris han d'estar configurats
      obligatòriament.
    </div>
    <!-- Instrumentos disponibles -->
    <div class="card">
      <div class="card-header pcc text-white fw-bold">Instruments d'Avaluació del Cicle</div>
      <div v-if="isLoading" class="list-group list-group-flush">
        <div class="list-group-item text-center py-4">
          <span class="spinner-border spinner-border-sm me-2"></span>
          Carregant...
        </div>
      </div>
      <template v-else>
        <div class="card-header bg-success text-white fw-bold">
          <i class="bi bi-check-circle-fill me-2"></i>
          Afegits
        </div>
        <ul class="list-group list-group-flush">
          <li v-if="addedTools.length === 0" class="list-group-item text-muted">
            Encara no hi ha instruments afegits
          </li>
          <li v-for="tool in addedTools" :key="tool.id" class="list-group-item">
            <div class="tool-row d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <div
                  class="d-flex align-items-center gap-2 mb-1 tool-title-row"
                  :class="{ 'tool-title-row--wrap': getAddedToolBadgeCount(tool) > 1 }"
                >
                  <i class="bi bi-check-circle-fill text-success" title="Consensuat"></i>
                  <strong class="tool-title">{{ tool.name + ' (' + tool.code + ')' }}</strong>
                  <div class="tool-badges d-flex align-items-center gap-1">
                    <span v-if="tool.isMandatory" class="badge bg-danger">Obligatori</span>
                    <span class="badge bg-success">Afegit</span>
                    <span v-if="tool.minPercentage" class="badge bg-warning text-dark">
                      Mínim: {{ tool.minPercentage }}% IC
                    </span>
                  </div>
                </div>
                <div class="mt-2">
                  <span
                    v-if="getAgreed(tool.id).minimumPercentage !== null"
                    class="badge bg-primary me-1"
                  >
                    {{ `${getAgreed(tool.id).minimumPercentage}%` }}
                  </span>
                  <div v-if="shouldShowTurnSummary(getAgreed(tool.id))" class="text-muted small">
                    Torns: {{ buildTurnSummary(getAgreed(tool.id)) }}
                  </div>
                  <div class="text-muted small">
                    Mòduls: {{ buildModuleSummary(getAgreed(tool.id)) }}
                  </div>
                </div>
              </div>
              <div class="tool-actions btn-group-vertical" role="group">
                <button
                  @click="openEditModal(tool.original)"
                  class="btn btn-sm btn-outline-primary"
                  :disabled="isSaving"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  @click="openDeleteConfirm(tool.original)"
                  class="btn btn-sm btn-outline-danger"
                  :disabled="isSaving"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </li>
        </ul>

        <div class="available-panel">
          <div class="card-header bg-warning text-dark fw-bold text-center">
            <i class="bi bi-exclamation-circle me-2"></i>
            Disponibles per a Afegir
          </div>
          <div class="card-body text-center">
            <label for="assessmentToolsSearch" class="form-label fw-bold">Cercar instruments</label>
            <div class="input-group mx-auto search-input">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input
                id="assessmentToolsSearch"
                v-model.trim="searchQuery"
                type="text"
                class="form-control"
                placeholder="Escriu el nom o el codi"
              />
            </div>
            <div v-if="searchQuery" class="form-text">
              Mostrant resultats per "{{ searchQuery }}"
            </div>
          </div>
          <div class="card-header bg-info text-white fw-bold">
            <i class="bi bi-clipboard-check me-2"></i>
            Obligatoris ({{ mandatoryPending.length }})
          </div>
          <ul class="list-group list-group-flush">
            <li v-if="mandatoryPending.length === 0" class="list-group-item text-success">
              Tots els obligatoris estan afegits
            </li>
            <li
              v-for="tool in mandatoryPending"
              :key="tool.assessmentTool.id"
              class="list-group-item"
            >
              <div class="tool-row d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <div
                    class="d-flex align-items-center gap-2 mb-1 tool-title-row"
                    :class="{ 'tool-title-row--wrap': getMandatoryPendingBadgeCount(tool) > 1 }"
                  >
                    <button
                      type="button"
                      class="pending-icon-button"
                      title="Obligatori - pendent de configurar"
                      aria-label="Afegir instrument obligatori"
                      :disabled="isSaving"
                      @click="openEditModal(tool)"
                    >
                      <i class="bi bi-exclamation-circle-fill text-warning"></i>
                    </button>
                    <strong>{{
                      tool.assessmentTool.name + ' (' + tool.assessmentTool.code + ')'
                    }}</strong>
                    <div class="tool-badges d-flex align-items-center gap-1">
                      <span class="badge bg-danger">Obligatori</span>
                      <span v-if="tool.minPercentage" class="badge bg-warning text-dark">
                        Mínim: {{ tool.minPercentage }}% IC
                      </span>
                    </div>
                  </div>
                </div>
                <div class="tool-actions btn-group-vertical" role="group">
                  <button
                    @click="openEditModal(tool)"
                    class="btn btn-sm btn-primary"
                    :disabled="isSaving"
                  >
                    <i class="bi bi-plus-circle"></i>
                  </button>
                </div>
              </div>
            </li>
          </ul>
          <div class="card-header bg-info text-white fw-bold">
            <i class="bi bi-clipboard-check me-2"></i>
            No obligatoris ({{ nonMandatoryPending.length }})
          </div>
          <ul class="list-group list-group-flush">
            <li v-if="nonMandatoryPending.length === 0" class="list-group-item text-muted">
              No hi ha instruments pendents
            </li>
            <li v-for="tool in nonMandatoryPending" :key="tool.id" class="list-group-item">
              <div class="tool-row d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <div
                    class="d-flex align-items-center gap-2 mb-1 tool-title-row"
                    :class="{ 'tool-title-row--wrap': getNonMandatoryPendingBadgeCount(tool) > 1 }"
                  >
                    <button
                      type="button"
                      class="pending-icon-button"
                      title="No consensuat"
                      aria-label="Afegir instrument no obligatori"
                      :disabled="isSaving"
                      @click="openEditModal(tool)"
                    >
                      <i class="bi bi-circle text-secondary"></i>
                    </button>
                    <strong class="tool-title">{{ tool.name + ' (' + tool.code + ')' }}</strong>
                    <div class="tool-badges d-flex align-items-center gap-1">
                      <span v-if="tool.minPercentage" class="badge bg-warning text-dark">
                        Mínim: {{ tool.minPercentage }}% IC
                      </span>
                    </div>
                  </div>
                </div>
                <div class="tool-actions btn-group-vertical" role="group">
                  <button
                    @click="openEditModal(tool)"
                    class="btn btn-sm btn-primary"
                    :disabled="isSaving"
                  >
                    <i class="bi bi-plus-circle"></i>
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </template>
    </div>

    <!-- Modal de edición -->
    <Teleport to="body">
      <div v-if="showEditModal && editingTool">
        <div class="modal d-block" tabindex="-1">
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-info text-white">
                <h5 class="modal-title">
                  <i class="bi bi-clipboard-check me-2"></i>
                  {{ editingTool.name }}
                </h5>
                <button
                  type="button"
                  class="btn-close btn-close-white"
                  @click="closeEditModal"
                ></button>
              </div>
              <div class="modal-body">
                <blockquote class="assessment-tool-quote">
                  {{
                    editingTool.description ||
                    'Sense descripció disponible per a aquest instrument.'
                  }}
                </blockquote>

                <div v-if="editingTool.isMandatory" class="alert alert-danger mb-3">
                  <i class="bi bi-exclamation-triangle-fill me-2"></i>
                  <strong>Instrument obligatori</strong> pel Projecte Educatiu de Centre
                </div>

                <!-- Porcentaje -->
                <div class="mb-3">
                  <label class="form-label fw-bold">
                    Percentatge mínim
                    <span v-if="!editingTool.isMandatory" class="text-muted">(opcional)</span>
                    <span v-if="editingTool.minPercentage" class="text-danger">
                      (mínim: {{ editingTool.minPercentage }}%)
                    </span>
                  </label>
                  <input
                    type="number"
                    class="form-control"
                    v-model.number="form.percentage"
                    :min="editingTool.minPercentage || 0"
                    max="100"
                    placeholder="Deixa en blanc si no assignes %"
                    :class="{ 'is-invalid': formErrors.percentage }"
                  />
                  <div v-if="formErrors.percentage" class="invalid-feedback">
                    {{ formErrors.percentage }}
                  </div>
                  <div class="form-text">
                    Pots deixar-ho en blanc si no vols assignar un percentatge mínim
                  </div>
                </div>

                <!-- Torns i mòduls -->
                <div class="mb-3">
                  <label class="form-label fw-bold">Aplicació de l'instrument</label>
                  <div v-if="editingTool.isMandatory" class="alert alert-info py-2">
                    Instrument obligatori per a tots els mòduls i torns.
                  </div>
                  <template v-else>
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="radio"
                        name="moduleSelectionTools"
                        id="allModulesTools"
                        :value="true"
                        v-model="applyToAllModules"
                      />
                      <label class="form-check-label" for="allModulesTools">Tots els mòduls</label>
                    </div>

                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="radio"
                        name="moduleSelectionTools"
                        id="specificModulesTools"
                        :value="false"
                        v-model="applyToAllModules"
                      />
                      <label class="form-check-label" for="specificModulesTools">
                        Mòduls concrets
                      </label>
                    </div>

                    <div v-if="hasMultipleTurns && applyToAllModules" class="mt-3">
                      <label class="form-label">Torns</label>
                      <div class="form-check">
                        <input
                          class="form-check-input"
                          type="radio"
                          name="turnSelectionTools"
                          id="allTurnsTools"
                          :value="true"
                          v-model="applyToAllTurns"
                        />
                        <label class="form-check-label" for="allTurnsTools">Tots els torns</label>
                      </div>

                      <div class="form-check">
                        <input
                          class="form-check-input"
                          type="radio"
                          name="turnSelectionTools"
                          id="specificTurnsTools"
                          :value="false"
                          v-model="applyToAllTurns"
                        />
                        <label class="form-check-label" for="specificTurnsTools">
                          Torns concrets
                        </label>
                      </div>

                      <fieldset v-if="!applyToAllTurns" class="suboption-fieldset mt-2">
                        <legend class="suboption-legend">Configura els torns concrets</legend>
                        <div
                          v-for="turnOption in availableTurnOptions"
                          :key="turnOption.value"
                          class="form-check"
                        >
                          <input
                            :id="`turn-${turnOption.value}`"
                            v-model="form.turns"
                            class="form-check-input"
                            type="checkbox"
                            :value="turnOption.value"
                            :disabled="isTurnOptionDisabled(turnOption.value)"
                          />
                          <label class="form-check-label" :for="`turn-${turnOption.value}`">
                            {{ turnOption.label }}
                          </label>
                        </div>
                        <div v-if="formErrors.turns" class="text-danger small mt-2">
                          {{ formErrors.turns }}
                        </div>
                        <div class="form-text">
                          Per a evitar duplicar opcions, en torns concrets no pots marcar-los tots.
                        </div>
                      </fieldset>
                    </div>

                    <fieldset v-if="!applyToAllModules" class="suboption-fieldset mt-3">
                      <legend class="suboption-legend">Configura els mòduls concrets</legend>
                      <label class="form-label">
                        {{
                          hasMultipleTurns
                            ? 'Selecciona combinacions mòdul+torn'
                            : 'Selecciona mòduls'
                        }}
                      </label>
                      <div class="module-selection table-responsive">
                        <table
                          class="table table-sm table-bordered align-middle mb-0 module-turn-grid"
                        >
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
                      <div v-if="formErrors.modules" class="text-danger small mt-2">
                        {{ formErrors.modules }}
                      </div>
                    </fieldset>
                  </template>
                </div>
              </div>
              <div class="modal-footer">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="closeEditModal"
                  :disabled="isSaving"
                >
                  Cancel·lar
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  @click="saveAgreed"
                  :disabled="isSaving || !isFormValid"
                >
                  <span v-if="isSaving" class="spinner-border spinner-border-sm me-1"></span>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show" @click="closeEditModal"></div>
      </div>
    </Teleport>

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
                  Vols eliminar l'instrument <strong>"{{ deleteTargetName }}"</strong> del PCC?
                </p>
              </div>
              <div class="modal-footer mx-auto">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="closeDeleteConfirm"
                  :disabled="isSaving"
                >
                  Cancel·lar
                </button>
                <button
                  type="button"
                  class="btn btn-danger"
                  @click="confirmDelete"
                  :disabled="isSaving"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show" @click="closeDeleteConfirm" />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.module-selection {
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  padding: 0.75rem;
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

.module-turn-grid td {
  min-width: 110px;
}

.module-turn-grid .module-cell {
  min-width: 220px;
}

.btn-group-vertical {
  gap: 2px;
}

.search-input {
  max-width: 520px;
}

.available-panel {
  background-color: #f8f9fa;
  padding: 0.25rem;
}

.available-panel .card-body {
  padding: 0.75rem;
}

.pending-icon-button {
  border: 0;
  background: transparent;
  padding: 0;
  line-height: 1;
  cursor: pointer;
}

.pending-icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.assessment-tool-quote {
  border-left: 4px solid #6c757d;
  background-color: #f8f9fa;
  color: #495057;
  font-style: italic;
  margin: 0 0 1rem;
  padding: 0.5rem 0.75rem;
}

@media (max-width: 576px) {
  .tool-title-row--wrap {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .tool-title-row--wrap .tool-badges {
    flex-basis: 100%;
    width: 100%;
  }

  .tool-row {
    flex-direction: column;
    gap: 0.75rem;
  }

  .tool-actions {
    align-self: center;
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: 0.5rem;
  }
}
</style>
