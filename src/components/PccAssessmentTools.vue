<script setup>
import { ref, computed, onMounted } from 'vue'
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

// Formulario
const form = ref({
  assessmentToolId: null,
  percentage: null,
  moduleCodes: []
})

const formErrors = ref({})

// Computeds
const currentModules = computed(() => pcc.value?.modules || [])

const allRequiredHavePercentage = computed(() => {
  return availableTools.value.mandatory.every((tool) => {
    const agreed = agreedTools.value.find((a) => a.assessmentTool?.id === tool.assessmentTool.id)
    return agreed && agreed.minimumPercentage !== null
  })
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

  // Validar módulos: si se seleccionan, deben ser al menos 2
  if (!editingTool.value?.isMandatory && form.value.moduleCodes.length === 1) return false

  return true
})

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

const openEditModal = (tool) => {
  // For mandatory tools, assessmentTool is nested; for nonMandatory, it's flat
  const assessmentToolId = tool.assessmentTool ? tool.assessmentTool.id : tool.id
  const toolName = tool.assessmentTool ? tool.assessmentTool.name : tool.name
  const minPct = tool.minPercentage || null
  const isMandatory = !!tool.assessmentTool

  editingTool.value = {
    id: assessmentToolId,
    name: toolName,
    minPercentage: minPct,
    isMandatory
  }

  const agreed = getAgreed(assessmentToolId)

  form.value = {
    assessmentToolId,
    percentage: agreed?.minimumPercentage ?? minPct ?? null,
    moduleCodes: isMandatory ? [] : agreed?.modules?.map((m) => m.code) || []
  }

  formErrors.value = {}
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingTool.value = null
  form.value = {
    assessmentToolId: null,
    percentage: null,
    moduleCodes: []
  }
  formErrors.value = {}
}

const toggleModule = (moduleCode) => {
  if (editingTool.value?.isMandatory) return
  const index = form.value.moduleCodes.indexOf(moduleCode)
  if (index > -1) {
    form.value.moduleCodes.splice(index, 1)
  } else {
    form.value.moduleCodes.push(moduleCode)
  }
}

const validateForm = () => {
  const errors = {}

  // Validar porcentaje mínimo
  if (editingTool.value?.minPercentage && form.value.percentage !== null) {
    if (form.value.percentage < editingTool.value.minPercentage) {
      errors.percentage = `El percentatge mínim és ${editingTool.value.minPercentage}%`
    }
  }

  // Validar módulos
  if (!editingTool.value?.isMandatory && form.value.moduleCodes.length === 1) {
    errors.modules = 'Has de seleccionar almenys 2 mòduls o cap (aplica a tots)'
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
      moduleCodes:
        editingTool.value?.isMandatory || form.value.moduleCodes.length === 0
          ? []
          : form.value.moduleCodes
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

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  const toolId = deleteTarget.value.id || deleteTarget.value.assessmentTool?.id
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
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <i class="bi bi-check-circle-fill text-success" title="Consensuat"></i>
                  <strong>{{ tool.name + ' (' + tool.code + ')' }}</strong>
                  <span v-if="tool.isMandatory" class="badge bg-danger">Obligatori</span>
                  <span class="badge bg-success">Afegit</span>
                  <span v-if="tool.minPercentage" class="badge bg-warning text-dark">
                    Mínim: {{ tool.minPercentage }}% IC
                  </span>
                </div>
                <div class="mt-2">
                  <span
                    v-if="getAgreed(tool.id).minimumPercentage !== null"
                    class="badge bg-primary me-1"
                  >
                    {{ `${getAgreed(tool.id).minimumPercentage}%` }}
                  </span>
                  <span class="text-muted small">
                    {{
                      getAgreed(tool.id).modules?.length > 0
                        ? `Mòduls: ${getAgreed(tool.id)
                            .modules.map((m) => m.code)
                            .join(', ')}`
                        : 'Aplica a tots els mòduls'
                    }}
                  </span>
                </div>
              </div>
              <div class="btn-group-vertical" role="group">
                <button
                  @click="openEditModal(tool.original)"
                  class="btn btn-sm btn-outline-primary"
                  :disabled="isSaving"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  v-if="!tool.isMandatory"
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
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <i
                      class="bi bi-exclamation-circle-fill text-warning"
                      title="Obligatori - pendent de configurar"
                    ></i>
                    <strong>{{
                      tool.assessmentTool.name + ' (' + tool.assessmentTool.code + ')'
                    }}</strong>
                    <span class="badge bg-danger">Obligatori</span>
                    <span v-if="tool.minPercentage" class="badge bg-warning text-dark">
                      Mínim: {{ tool.minPercentage }}% IC
                    </span>
                  </div>
                </div>
                <div class="btn-group-vertical" role="group">
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
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <i class="bi bi-circle text-secondary" title="No consensuat"></i>
                    <strong>{{ tool.name + ' (' + tool.code + ')' }}</strong>
                    <span v-if="tool.minPercentage" class="badge bg-warning text-dark">
                      Mínim: {{ tool.minPercentage }}% IC
                    </span>
                  </div>
                </div>
                <div class="btn-group-vertical" role="group">
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
                <div v-if="editingTool.isMandatory" class="alert alert-danger mb-3">
                  <i class="bi bi-exclamation-triangle-fill me-2"></i>
                  <strong>Instrument obligatori</strong> pel Projecte Educatiu de Centre
                </div>

                <!-- Porcentaje -->
                <div class="mb-3">
                  <label class="form-label fw-bold">
                    Percentatge
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
                    Pots deixar-ho en blanc si no vols assignar un percentatge específic
                  </div>
                </div>

                <!-- Módulos -->
                <div class="mb-3">
                  <label class="form-label fw-bold">Mòduls</label>
                  <div v-if="editingTool.isMandatory" class="alert alert-info py-2">
                    Aquest instrument és obligatori i s'aplica a tots els mòduls del cicle.
                  </div>
                  <div v-else class="form-text mb-2">
                    Selecciona els mòduls als quals aplica (mínim 2 o cap per aplicar a tots)
                  </div>
                  <div class="module-selection">
                    <div v-for="module in currentModules" :key="module.code" class="form-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :id="`mod-${module.code}`"
                        :value="module.code"
                        :checked="form.moduleCodes.includes(module.code)"
                        :disabled="editingTool.isMandatory"
                        @change="toggleModule(module.code)"
                      />
                      <label class="form-check-label" :for="`mod-${module.code}`">
                        <strong>{{ module.code }}</strong> - {{ module.name }}
                      </label>
                    </div>
                  </div>
                  <div v-if="formErrors.modules" class="text-danger small mt-2">
                    {{ formErrors.modules }}
                  </div>
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
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  padding: 0.75rem;
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
</style>
