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
const showEditModal = ref(false)
const editingTool = ref(null)

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
  return availableTools.value.mandatory.every(tool => {
    const agreed = agreedTools.value.find(a => a.assessmentTool?.id === tool.assessmentTool.id)
    return agreed && agreed.minimumPercentage !== null
  })
})

const findToolById = (assessmentToolId) => {
  const mandatory = availableTools.value.mandatory.find(t => t.assessmentTool.id === assessmentToolId)
  if (mandatory) return { ...mandatory.assessmentTool, minPercentage: mandatory.minPercentage, isMandatory: true }
  const nonMandatory = availableTools.value.nonMandatory.find(t => t.id === assessmentToolId)
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
  if (form.value.moduleCodes.length === 1) return false

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
  return agreedTools.value.some(a => a.assessmentTool?.id === toolId)
}

const getAgreed = (toolId) => {
  return agreedTools.value.find(a => a.assessmentTool?.id === toolId)
}

const openEditModal = (tool) => {
  // For mandatory tools, assessmentTool is nested; for nonMandatory, it's flat
  const assessmentToolId = tool.assessmentTool ? tool.assessmentTool.id : tool.id
  const toolName = tool.assessmentTool ? tool.assessmentTool.name : tool.name
  const minPct = tool.minPercentage || null

  editingTool.value = {
    id: assessmentToolId,
    name: toolName,
    minPercentage: minPct,
    isMandatory: !!tool.assessmentTool
  }

  const agreed = getAgreed(assessmentToolId)

  form.value = {
    assessmentToolId,
    percentage: agreed?.minimumPercentage ?? minPct ?? null,
    moduleCodes: agreed?.modules?.map(m => m.code) || []
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
  if (form.value.moduleCodes.length === 1) {
    errors.modules = 'Has de seleccionar almenys 2 mòduls o cap (aplica a tots)'
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveAgreed = async () => {
  if (!validateForm()) return

  isLoading.value = true
  try {
    const data = {
      assessmentToolId: form.value.assessmentToolId,
      minPercentage: form.value.percentage,
      moduleCodes: form.value.moduleCodes.length > 0 ? form.value.moduleCodes : []
    }

    const success = await savePCCAgreedAssessmentTool(props.pccId, data)
    if (success) {
      await loadData()
      closeEditModal()
      store.addMessage('success', 'Instrument consensuat guardat')
    }
  } finally {
    isLoading.value = false
  }
}

const confirmDelete = async (tool) => {
  if (!confirm(`Segur que vols eliminar l'instrument "${tool.name}"?`)) return

  isLoading.value = true
  try {
    const success = await deletePCCAgreedAssessmentTool(props.pccId, tool.id)
    if (success) {
      await loadData()
      store.addMessage('success', 'Instrument eliminat')
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="pcc-assessment-tools">
    <!-- Instrumentos disponibles -->
    <div class="card">
      <div class="card-header pcc text-white fw-bold">
        Instruments d'Avaluació del Cicle
      </div>
      <div class="card-header bg-info text-white fw-bold">
        <i class="bi bi-clipboard-check me-2"></i>
        Obligatoris
      </div>
      <ul class="list-group list-group-flush">
        <li v-if="availableTools.mandatory.length === 0 && !isLoading" class="list-group-item text-center text-muted">
          <i class="bi bi-info-circle me-1"></i>
          No hi ha instruments disponibles
        </li>
        <li v-if="isLoading" class="list-group-item text-center">
          <span class="spinner-border spinner-border-sm me-2"></span>
          Carregant...
        </li>
        <li v-for="tool in availableTools.mandatory" :key="tool.assessmentTool.id" class="list-group-item">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2 mb-1">
                <i v-if="hasAgreed(tool.assessmentTool.id)" class="bi bi-check-circle-fill text-success" title="Consensuat"></i>
                <i v-else class="bi bi-exclamation-circle-fill text-warning"
                  title="Obligatori - pendent de configurar"></i>
                <strong>{{ tool.assessmentTool.name + ' (' + tool.assessmentTool.code + ')' }}</strong>
                <span class="badge bg-danger">Obligatori</span>

                <span v-if="tool.minPercentage" class="badge bg-warning text-dark">
                  Mínim: {{ tool.minPercentage }}%
                </span>
              </div>
              <div v-if="hasAgreed(tool.assessmentTool.id)" class="mt-2">
                <span class="badge bg-primary me-1">
                  {{ getAgreed(tool.assessmentTool.id).minimumPercentage ? `${getAgreed(tool.assessmentTool.id).minimumPercentage}%` : 'Sense %' }}
                </span>
                <span class="text-muted small">
                  {{ getAgreed(tool.assessmentTool.id).modules?.length > 0
          ? `Mòduls: ${getAgreed(tool.assessmentTool.id).modules.map(m => m.code).join(', ')}`
          : 'Aplica a tots els mòduls'
                  }}
                </span>
              </div>
            </div>
            <div class="btn-group-vertical" role="group">
              <button @click="openEditModal(tool)" class="btn btn-sm"
                :class="hasAgreed(tool.assessmentTool.id) ? 'btn-outline-primary' : 'btn-primary'" :disabled="isLoading">
                <i :class="hasAgreed(tool.assessmentTool.id) ? 'bi-pencil' : 'bi-plus-circle'"></i>
              </button>
            </div>
          </div>
        </li>
      </ul>
      <div class="card-header bg-info text-white fw-bold">
        <i class="bi bi-clipboard-check me-2"></i>
        No obligatoris
      </div>
      <ul class="list-group list-group-flush">
        <li v-if="availableTools.nonMandatory.length === 0 && !isLoading"
          class="list-group-item text-center text-muted">
          <i class="bi bi-info-circle me-1"></i>
          No hi ha instruments disponibles
        </li>
        <li v-if="isLoading" class="list-group-item text-center">
          <span class="spinner-border spinner-border-sm me-2"></span>
          Carregant...
        </li>
        <li v-for="tool in availableTools.nonMandatory" :key="tool.id" class="list-group-item">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2 mb-1">
                <i v-if="hasAgreed(tool.id)" class="bi bi-check-circle-fill text-success" title="Consensuat"></i>
                <i v-else class="bi bi-circle text-secondary" title="No consensuat"></i>
                <strong>{{ tool.name + ' (' + tool.code + ')' }}</strong>
                <span v-if="tool.minPercentage" class="badge bg-warning text-dark">
                  Mínim: {{ tool.minPercentage }}%
                </span>
              </div>
              <div v-if="hasAgreed(tool.id)" class="mt-2">
                <span class="badge bg-primary me-1">
                  {{ getAgreed(tool.id).minimumPercentage ? `${getAgreed(tool.id).minimumPercentage}%` : 'Sense %' }}
                </span>
                <span class="text-muted small">
                  {{ getAgreed(tool.id).modules?.length > 0
          ? `Mòduls: ${getAgreed(tool.id).modules.map(m => m.code).join(', ')}`
          : 'Aplica a tots els mòduls'
                  }}
                </span>
              </div>
            </div>
            <div class="btn-group-vertical" role="group">
              <button @click="openEditModal(tool)" class="btn btn-sm"
                :class="hasAgreed(tool.id) ? 'btn-outline-primary' : 'btn-primary'" :disabled="isLoading">
                <i :class="hasAgreed(tool.id) ? 'bi-pencil' : 'bi-plus-circle'"></i>
              </button>
              <button v-if="hasAgreed(tool.id) && !tool.isMandatory" @click="confirmDelete(tool)"
                class="btn btn-sm btn-outline-danger" :disabled="isLoading">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </li>
      </ul>
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
                <button type="button" class="btn-close btn-close-white" @click="closeEditModal"></button>
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
                  <input type="number" class="form-control" v-model.number="form.percentage"
                    :min="editingTool.minPercentage || 0" max="100" placeholder="Deixa en blanc si no assignes %"
                    :class="{ 'is-invalid': formErrors.percentage }">
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
                  <div class="form-text mb-2">
                    Selecciona els mòduls als quals aplica (mínim 2 o cap per aplicar a tots)
                  </div>
                  <div class="module-selection">
                    <div v-for="module in currentModules" :key="module.code" class="form-check">
                      <input class="form-check-input" type="checkbox" :id="`mod-${module.code}`" :value="module.code"
                        :checked="form.moduleCodes.includes(module.code)" @change="toggleModule(module.code)">
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
                <button type="button" class="btn btn-secondary" @click="closeEditModal" :disabled="isLoading">
                  Cancel·lar
                </button>
                <button type="button" class="btn btn-primary" @click="saveAgreed" :disabled="isLoading || !isFormValid">
                  <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show" @click="closeEditModal"></div>
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
</style>
