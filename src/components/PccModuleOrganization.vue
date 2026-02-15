<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/stores/data'
import { useModuleOrganization } from '@/composables/useModuleOrganization'

// Props
const props = defineProps({
  pccId: {
    type: Number,
    required: true
  }
})

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)
const { savePCCModuleOrganization, deletePCCModuleOrganization } = store

// Composable de validación
const { getValidationErrors, isFormValid, calculateDistributionSum } = useModuleOrganization()

// Estado local
const isLoading = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const moduleToDelete = ref(null)
const editingModule = ref(null)

// Formulario
const form = ref({
  distribution: '',
  classroomHours: 0,
  labHours: 0,
  language: 'ca-ES',
  dualizable: false,
  otherConsiderations: ''
})

const formErrors = ref({})

// Idiomas disponibles
const availableLanguages = [
  { value: 'ca-ES', label: 'Català (ca-ES)' },
  { value: 'es-ES', label: 'Castellà (es-ES)' },
  { value: 'en-GB', label: 'Anglès (en-GB)' },
  { value: 'de-DE', label: 'Alemany (de-DE)' },
  { value: 'fr-FR', label: 'Francès (fr-FR)' }
]

const requiredLanguages = [
  { value: 'en-GB', label: 'Anglès' },
  { value: 'ca-ES', label: 'Valencià' },
  { value: 'es-ES', label: 'Castellà' }
]

const languageColors = {
  'en-GB': '#0d6efd',
  'ca-ES': '#198754',
  'es-ES': '#fd7e14',
  other: '#6c757d',
  unassigned: '#adb5bd'
}

const normalizeLanguageValue = (language) => {
  const raw = language?.value || language?.code || language
  if (!raw || typeof raw !== 'string') return null
  const normalized = raw.trim()
  const map = {
    ca: 'ca-ES',
    'ca-es': 'ca-ES',
    es: 'es-ES',
    'es-es': 'es-ES',
    en: 'en-GB',
    'en-gb': 'en-GB',
    de: 'de-DE',
    'de-de': 'de-DE',
    fr: 'fr-FR',
    'fr-fr': 'fr-FR'
  }
  const key = normalized.toLowerCase()
  return map[key] || normalized
}

// Computeds
const modulesByCourse = computed(() => {
  const grouped = {
    1: [],
    2: []
  }

  if (!pcc.value?.modules) return grouped

  pcc.value.modules.forEach((module) => {
    const level = module.courseLevel || 1
    if (grouped[level]) {
      // Añadir información de la organización si existe
      const organization = getModuleOrganization(module.code)
      grouped[level].push({
        ...module,
        organization
      })
    }
  })

  return grouped
})

const allModulesHaveOrganization = computed(() => {
  if (!pcc.value?.modules) return false
  return pcc.value.modules.every((module) => hasOrganization(module.code))
})

const organizationCompletionPercentage = computed(() => {
  if (!pcc.value?.modules || pcc.value.modules.length === 0) return 0
  const total = pcc.value.modules.length
  const completed = pcc.value.modules.filter((module) => hasOrganization(module.code)).length
  return Math.round((completed / total) * 100)
})

const languageChart = computed(() => {
  if (!pcc.value?.modules || pcc.value.modules.length === 0) return null

  const modules = pcc.value.modules
  const totalHours = modules.reduce((sum, module) => sum + (module.weekHours || 0), 0)
  if (!totalHours) return null

  const requiredLanguageValues = new Set(requiredLanguages.map((lang) => lang.value))
  const hoursByLanguage = {}
  let otherHours = 0
  let unassignedHours = 0

  modules.forEach((module) => {
    const hours = module.weekHours || 0
    const organization = getModuleOrganization(module.code)
    if (!organization) {
      unassignedHours += hours
      return
    }

    const value = normalizeLanguageValue(organization.language)
    if (value && requiredLanguageValues.has(value)) {
      hoursByLanguage[value] = (hoursByLanguage[value] || 0) + hours
    } else if (value) {
      otherHours += hours
    }
  })

  const segments = requiredLanguages
    .map((lang) => {
      const hours = hoursByLanguage[lang.value] || 0
      if (!hours) return null
      return {
        key: lang.value,
        label: lang.label,
        hours,
        percentage: Math.round((hours / totalHours) * 100),
        color: languageColors[lang.value]
      }
    })
    .filter(Boolean)

  if (otherHours) {
    segments.push({
      key: 'other',
      label: 'Altres idiomes',
      hours: otherHours,
      percentage: Math.round((otherHours / totalHours) * 100),
      color: languageColors.other
    })
  }

  if (unassignedHours) {
    segments.push({
      key: 'unassigned',
      label: 'No assignades',
      hours: unassignedHours,
      percentage: Math.round((unassignedHours / totalHours) * 100),
      color: languageColors.unassigned
    })
  }

  return {
    totalHours,
    segments
  }
})

const languageDonutStyle = computed(() => {
  if (!languageChart.value?.segments?.length) return {}

  let currentHours = 0
  const totalHours = languageChart.value.totalHours
  const parts = languageChart.value.segments.map((segment) => {
    const start = (currentHours / totalHours) * 100
    currentHours += segment.hours
    const end = (currentHours / totalHours) * 100
    return `${segment.color} ${start}% ${end}%`
  })

  return {
    background: `conic-gradient(${parts.join(', ')})`
  }
})

// Validación reactiva
watch(
  () => form.value.distribution,
  () => {
    if (editingModule.value) {
      validateForm()
    }
  }
)

watch(
  () => [form.value.classroomHours, form.value.labHours],
  () => {
    if (editingModule.value) {
      validateForm()
    }
  }
)

// Métodos
const getModuleOrganization = (moduleCode) => {
  if (!pcc.value?.moduleOrganizations) return null
  return pcc.value.moduleOrganizations.find((mo) => mo.module?.code === moduleCode)
}

const hasOrganization = (moduleCode) => {
  return !!getModuleOrganization(moduleCode)
}

const openEditModal = (module) => {
  editingModule.value = module
  const organization = getModuleOrganization(module.code)

  if (organization) {
    // Editar organización existente
    form.value = {
      distribution: organization.distribution || '',
      classroomHours: organization.classroomHours || 0,
      labHours: organization.labHours || 0,
      language: normalizeLanguageValue(organization.language) || 'ca-ES',
      dualizable: !!organization.dualizable,
      otherConsiderations: organization.otherConsiderations || ''
    }
  } else {
    // Nueva organización
    form.value = {
      distribution: '',
      classroomHours: 0,
      labHours: 0,
      language: 'ca-ES',
      dualizable: false,
      otherConsiderations: ''
    }
  }

  formErrors.value = {}
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingModule.value = null
  form.value = {
    distribution: '',
    classroomHours: 0,
    labHours: 0,
    language: 'ca-ES',
    dualizable: false,
    otherConsiderations: ''
  }
  formErrors.value = {}
}

const openDeleteModal = (module) => {
  moduleToDelete.value = module
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  moduleToDelete.value = null
}

const validateForm = () => {
  if (!editingModule.value) return false

  const errors = getValidationErrors(form.value, editingModule.value.weekHours)
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveOrganization = async () => {
  if (!editingModule.value) return

  if (!validateForm()) {
    store.addMessage('error', 'Corregeix els errors abans de guardar')
    return
  }

  isLoading.value = true
  try {
    const data = {
      moduleCode: editingModule.value.code,
      distribution: form.value.distribution.trim(),
      classroomHours: parseInt(form.value.classroomHours, 10),
      labHours: parseInt(form.value.labHours, 10),
      language: form.value.language,
      dualizable: !!form.value.dualizable,
      otherConsiderations: form.value.otherConsiderations?.trim() || null
    }

    const success = await savePCCModuleOrganization(props.pccId, data)
    if (success) {
      closeEditModal()
      store.addMessage('success', 'Organització del mòdul guardada correctament')
    }
  } catch (error) {
    store.addMessage('error', "Error en guardar l'organització")
  } finally {
    isLoading.value = false
  }
}

const confirmDelete = async () => {
  if (!moduleToDelete.value) return

  isLoading.value = true
  try {
    const success = await deletePCCModuleOrganization(props.pccId, moduleToDelete.value.code)
    if (success) {
      closeDeleteModal()
      store.addMessage('success', 'Organització eliminada correctament')
    }
  } catch (error) {
    store.addMessage('error', "Error en eliminar l'organització")
  } finally {
    isLoading.value = false
  }
}

const distributionSum = computed(() => {
  return calculateDistributionSum(form.value.distribution)
})

const hoursSum = computed(() => {
  return (parseInt(form.value.classroomHours, 10) || 0) + (parseInt(form.value.labHours, 10) || 0)
})
</script>

<template>
  <div class="pcc-module-organization">
    <!-- Título y progreso -->
    <div class="d-flex justify-content-end align-items-center mb-3">
      <div class="text-end">
        <span v-if="allModulesHaveOrganization" class="badge bg-success fs-6">
          <i class="bi bi-check-circle me-1"></i>
          Completat
        </span>
        <span v-else class="badge bg-warning text-dark fs-6">
          <i class="bi bi-exclamation-triangle me-1"></i>
          En progrés
        </span>
      </div>
    </div>

    <div class="row g-3 align-items-start mb-4">
      <div class="col-12 col-lg-6">
        <div class="d-flex align-items-center mb-2">
          <i class="bi bi-clipboard-check me-2"></i>
          <h6 class="mb-0">Compleció de l'organització</h6>
        </div>
        <div class="progress" style="height: 25px">
          <div
            class="progress-bar"
            :class="allModulesHaveOrganization ? 'bg-success' : 'bg-warning'"
            role="progressbar"
            :style="{ width: organizationCompletionPercentage + '%' }"
            :aria-valuenow="organizationCompletionPercentage"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <strong>{{ organizationCompletionPercentage }}%</strong>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-6">
        <div v-if="languageChart">
          <div class="d-flex align-items-center mb-2">
            <i class="bi bi-translate me-2"></i>
            <h6 class="mb-0">Idioma seleccionat als mòduls</h6>
          </div>
          <div class="d-flex flex-column flex-md-row gap-3 align-items-start">
            <div class="language-donut" :style="languageDonutStyle">
              <div class="language-donut__center">
                <div class="fw-bold">{{ languageChart.totalHours }}h</div>
                <div class="small text-muted">Setmanals</div>
              </div>
            </div>
            <div class="flex-grow-1">
              <div
                v-for="segment in languageChart.segments"
                :key="segment.key"
                class="d-flex align-items-center mb-2"
              >
                <span class="legend-dot" :style="{ backgroundColor: segment.color }"></span>
                <span class="me-auto">{{ segment.label }}</span>
                <strong>{{ segment.percentage }}%</strong>
                <span class="text-muted ms-2">{{ segment.hours }}h/setmana</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Módulos divididos por curso -->
    <div class="row g-3">
      <!-- 1º Curso -->
      <div class="col-12 col-lg-6">
        <div class="card h-100">
          <div class="card-header bg-primary text-white fw-bold">
            <i class="bi bi-journal-text me-2"></i>
            1r Curs
          </div>
          <ul class="list-group list-group-flush">
            <li
              v-if="modulesByCourse[1].length === 0"
              class="list-group-item text-muted text-center"
            >
              <i class="bi bi-info-circle me-1"></i>
              No hi ha mòduls de 1r curs
            </li>
            <li v-for="module in modulesByCourse[1]" :key="module.code" class="list-group-item">
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <i
                      v-if="hasOrganization(module.code)"
                      class="bi bi-check-circle-fill text-success"
                      title="Organització definida"
                    ></i>
                    <i
                      v-else
                      class="bi bi-exclamation-circle-fill text-warning"
                      title="Organització pendent"
                    ></i>
                    <strong>{{ module.name }} ({{ module.code }})</strong>
                    <span class="badge bg-secondary">{{ module.weekHours }}h</span>
                  </div>
                  <div v-if="module.organization" class="mt-2 small">
                    <span class="badge bg-info me-1">{{ module.organization.distribution }}</span>
                    <span class="text-muted">
                      Aula: {{ module.organization.classroomHours }}h | Lab:
                      {{ module.organization.labHours }}h
                    </span>
                    <span
                      class="badge ms-2"
                      :class="module.organization.dualizable ? 'bg-success' : 'bg-secondary'"
                    >
                      {{ module.organization.dualizable ? 'Dualitzable' : 'No dualitzable' }}
                    </span>
                  </div>
                </div>
                <div class="btn-group-vertical" role="group">
                  <button
                    @click="openEditModal(module)"
                    class="btn btn-sm"
                    :class="hasOrganization(module.code) ? 'btn-outline-primary' : 'btn-primary'"
                    :disabled="isLoading"
                    :title="
                      hasOrganization(module.code)
                        ? 'Modificar organització'
                        : 'Definir organització'
                    "
                  >
                    <i :class="hasOrganization(module.code) ? 'bi-pencil' : 'bi-plus-circle'"></i>
                  </button>
                  <button
                    v-if="hasOrganization(module.code)"
                    @click="openDeleteModal(module)"
                    class="btn btn-sm btn-outline-danger"
                    :disabled="isLoading"
                    title="Eliminar organització"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- 2º Curso -->
      <div class="col-12 col-lg-6">
        <div class="card h-100">
          <div class="card-header bg-success text-white fw-bold">
            <i class="bi bi-journal-text me-2"></i>
            2n Curs
          </div>
          <ul class="list-group list-group-flush">
            <li
              v-if="modulesByCourse[2].length === 0"
              class="list-group-item text-muted text-center"
            >
              <i class="bi bi-info-circle me-1"></i>
              No hi ha mòduls de 2n curs
            </li>
            <li v-for="module in modulesByCourse[2]" :key="module.code" class="list-group-item">
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <i
                      v-if="hasOrganization(module.code)"
                      class="bi bi-check-circle-fill text-success"
                      title="Organització definida"
                    ></i>
                    <i
                      v-else
                      class="bi bi-exclamation-circle-fill text-warning"
                      title="Organització pendent"
                    ></i>
                    <strong>{{ module.name }} ({{ module.code }})</strong>
                    <span class="badge bg-secondary">{{ module.weekHours }}h</span>
                  </div>
                  <div v-if="module.organization" class="mt-2 small">
                    <span class="badge bg-info me-1">{{ module.organization.distribution }}</span>
                    <span class="text-muted">
                      Aula: {{ module.organization.classroomHours }}h | Lab:
                      {{ module.organization.labHours }}h
                    </span>
                    <span
                      class="badge ms-2"
                      :class="module.organization.dualizable ? 'bg-success' : 'bg-secondary'"
                    >
                      {{ module.organization.dualizable ? 'Dualitzable' : 'No dualitzable' }}
                    </span>
                  </div>
                </div>
                <div class="btn-group-vertical" role="group">
                  <button
                    @click="openEditModal(module)"
                    class="btn btn-sm"
                    :class="hasOrganization(module.code) ? 'btn-outline-primary' : 'btn-primary'"
                    :disabled="isLoading"
                    :title="
                      hasOrganization(module.code)
                        ? 'Modificar organització'
                        : 'Definir organització'
                    "
                  >
                    <i :class="hasOrganization(module.code) ? 'bi-pencil' : 'bi-plus-circle'"></i>
                  </button>
                  <button
                    v-if="hasOrganization(module.code)"
                    @click="openDeleteModal(module)"
                    class="btn btn-sm btn-outline-danger"
                    :disabled="isLoading"
                    title="Eliminar organització"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Modal de edición -->
    <Teleport to="body">
      <div v-if="showEditModal && editingModule">
        <div class="modal d-block" tabindex="-1">
          <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content">
              <div class="modal-header bg-primary text-white">
                <h5 class="modal-title">
                  <i class="bi bi-gear me-2"></i>
                  Organització del Mòdul: {{ editingModule.code }}
                </h5>
                <button
                  type="button"
                  class="btn-close btn-close-white"
                  @click="closeEditModal"
                  aria-label="Close"
                ></button>
              </div>
              <div class="modal-body">
                <div class="alert alert-info mb-3">
                  <strong>{{ editingModule.name }}</strong>
                  <div class="mt-1">
                    Hores setmanals: <strong>{{ editingModule.weekHours }}</strong>
                  </div>
                </div>

                <!-- Distribution -->
                <div class="mb-3">
                  <label class="form-label fw-bold">
                    Distribució <span class="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    class="form-control"
                    v-model="form.distribution"
                    placeholder="Ex: 2+9 o 1+2+3"
                    :class="{ 'is-invalid': formErrors.distribution }"
                  />
                  <div class="form-text">
                    Format: 1-2 dígits(+1-2 dígits)*. Ex: "2", "12+9", "1+20+3"
                    <span v-if="form.distribution" class="ms-2">
                      - Suma: <strong>{{ distributionSum }}</strong>
                      <i
                        v-if="distributionSum === editingModule.weekHours"
                        class="bi bi-check-circle-fill text-success ms-1"
                      ></i>
                      <i v-else class="bi bi-x-circle-fill text-danger ms-1"></i>
                    </span>
                  </div>
                  <div v-if="formErrors.distribution" class="invalid-feedback d-block">
                    {{ formErrors.distribution }}
                  </div>
                </div>

                <!-- Classroom Hours -->
                <div class="mb-3">
                  <label class="form-label fw-bold">
                    Hores d'Aula <span class="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    class="form-control"
                    v-model.number="form.classroomHours"
                    min="0"
                    :class="{ 'is-invalid': formErrors.classroomHours }"
                  />
                  <div v-if="formErrors.classroomHours" class="invalid-feedback">
                    {{ formErrors.classroomHours }}
                  </div>
                </div>

                <!-- Lab Hours -->
                <div class="mb-3">
                  <label class="form-label fw-bold">
                    Hores de Laboratori <span class="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    class="form-control"
                    v-model.number="form.labHours"
                    min="0"
                    :class="{ 'is-invalid': formErrors.labHours }"
                  />
                  <div v-if="formErrors.labHours" class="invalid-feedback">
                    {{ formErrors.labHours }}
                  </div>
                </div>

                <!-- Hours Sum Validation -->
                <div
                  v-if="form.classroomHours !== null && form.labHours !== null"
                  class="alert"
                  :class="hoursSum === editingModule.weekHours ? 'alert-success' : 'alert-warning'"
                >
                  <strong>Total hores: {{ hoursSum }}</strong>
                  <span v-if="hoursSum === editingModule.weekHours">
                    <i class="bi bi-check-circle-fill ms-2"></i> Correcte!
                  </span>
                  <span v-else>
                    <i class="bi bi-exclamation-triangle-fill ms-2"></i>
                    Ha de sumar {{ editingModule.weekHours }}
                  </span>
                </div>
                <div v-if="formErrors.hoursSum" class="alert alert-danger">
                  {{ formErrors.hoursSum }}
                </div>

                <!-- Language -->
                <div class="mb-3">
                  <label class="form-label fw-bold">
                    Idioma <span class="text-danger">*</span>
                  </label>
                  <select
                    class="form-select"
                    v-model="form.language"
                    :class="{ 'is-invalid': formErrors.language }"
                  >
                    <option
                      v-for="lang in availableLanguages"
                      :key="lang.value"
                      :value="lang.value"
                    >
                      {{ lang.label }}
                    </option>
                  </select>
                  <div v-if="formErrors.language" class="invalid-feedback">
                    {{ formErrors.language }}
                  </div>
                </div>

                <!-- Dualizable -->
                <div class="mb-3">
                  <label class="form-label fw-bold">Dualitzable al centre</label>
                  <div class="form-check form-switch">
                    <input
                      id="dualizable-switch"
                      class="form-check-input"
                      type="checkbox"
                      v-model="form.dualizable"
                    />
                    <label class="form-check-label" for="dualizable-switch">
                      Indica si el mòdul es vol dualitzar al nostre centre en aquest cicle
                    </label>
                  </div>
                </div>

                <!-- Other Considerations -->
                <div class="mb-3">
                  <label class="form-label fw-bold"> Altres Consideracions </label>
                  <textarea
                    class="form-control"
                    v-model="form.otherConsiderations"
                    rows="3"
                    maxlength="500"
                    placeholder="Informació addicional sobre l'organització del mòdul"
                  ></textarea>
                  <div class="form-text">
                    {{ form.otherConsiderations?.length || 0 }} / 500 caràcters
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="closeEditModal"
                  :disabled="isLoading"
                >
                  <i class="bi bi-x-circle me-1"></i>
                  Cancel·lar
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  @click="saveOrganization"
                  :disabled="isLoading"
                >
                  <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-check-circle me-1"></i>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show" @click="closeEditModal"></div>
      </div>
    </Teleport>

    <!-- Modal de confirmación de eliminación -->
    <Teleport to="body">
      <div v-if="showDeleteModal && moduleToDelete">
        <div class="modal d-block" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-danger text-white">
                <h5 class="modal-title">
                  <i class="bi bi-exclamation-triangle me-2"></i>
                  Confirmar eliminació
                </h5>
                <button
                  type="button"
                  class="btn-close btn-close-white"
                  @click="closeDeleteModal"
                  aria-label="Close"
                ></button>
              </div>
              <div class="modal-body">
                <p>Estàs segur que vols eliminar l'organització del mòdul:</p>
                <div class="alert alert-secondary mb-0">
                  <strong>{{ moduleToDelete.code }}</strong> - {{ moduleToDelete.name }}
                </div>
              </div>
              <div class="modal-footer">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="closeDeleteModal"
                  :disabled="isLoading"
                >
                  <i class="bi bi-x-circle me-1"></i>
                  Cancel·lar
                </button>
                <button
                  type="button"
                  class="btn btn-danger"
                  @click="confirmDelete"
                  :disabled="isLoading"
                >
                  <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-trash me-1"></i>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show" @click="closeDeleteModal"></div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.pcc-module-organization {
  margin-bottom: 1.5rem;
}

.btn-group-vertical {
  gap: 2px;
}

.language-donut {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e9ecef;
  flex: 0 0 auto;
}

.language-donut__center {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: 0 0 0 1px #dee2e6;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
}
</style>
