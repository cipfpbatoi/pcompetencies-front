<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/stores/data'

// Props
const props = defineProps({
  pccId: {
    type: Number,
    required: true
  }
})

// Store
const store = useDataStore()
const { pcc, cycle } = storeToRefs(store)
const { addModuleToPCC, removeModuleFromPCC, fetchCycle } = store
const getPccTurn = () => 'presential'

// Estado local
const isLoading = ref(false)
const isLoadingCycle = ref(false)
const hasTriedLoadingCycle = ref(false)
const selectedModulesToAdd = ref([])
const moduleToDelete = ref(null)
const showAddModal = ref(false)
const showDeleteModal = ref(false)

// Cargar ciclo si no está disponible, incluso cuando el PCC llega después del montaje
const ensureCycleLoaded = async () => {
  const pccTurn = getPccTurn()
  const shouldFetchCycle =
    pcc.value?.cycle?.id &&
    (!cycle.value?.id ||
      cycle.value.id !== pcc.value.cycle.id ||
      cycle.value.loadedTurn !== pccTurn ||
      !Array.isArray(cycle.value?.modules) ||
      cycle.value.modulesFilteredByDepartment)

  if (!shouldFetchCycle) {
    hasTriedLoadingCycle.value = true
  }

  if (shouldFetchCycle && !isLoadingCycle.value) {
    isLoadingCycle.value = true
    try {
      await fetchCycle(pcc.value.cycle.id, pccTurn, { filterByDepartment: false })
    } finally {
      hasTriedLoadingCycle.value = true
      isLoadingCycle.value = false
    }
  }
}

watch(() => pcc.value?.cycle?.id, ensureCycleLoaded, { immediate: true })

// Computeds
const currentModules = computed(() => {
  return pcc.value?.modules || []
})

const isOptionalModule = (module) => String(module?.code || '').startsWith('CVOP')

const TURN_LABELS = {
  presential: 'Presencial',
  'half-presential': 'Semi-presencial'
}

const getModuleOrganization = (module) => {
  return pcc.value?.moduleOrganizations?.find(
    (organization) => organization.module?.code === module.code
  )
}

const getOptionalTurnRestriction = (module) => {
  const optionalTurns = getModuleOrganization(module)?.optionalTurns

  if (!Array.isArray(optionalTurns) || optionalTurns.length === 0) return null
  return optionalTurns.map((turn) => TURN_LABELS[turn] || turn).join(', ')
}

const isLogseCycle = computed(() => {
  const cycleInfo = pcc.value?.cycle || cycle.value || {}
  if (cycleInfo.isLogse !== undefined && cycleInfo.isLogse !== null) {
    return Boolean(cycleInfo.isLogse)
  }
  const shortName = cycleInfo.shortName || cycleInfo.short_name || ''
  const completeName = cycleInfo.completeName || cycleInfo.complete_name || ''
  return `${shortName} ${completeName}`.toUpperCase().includes('LOGSE')
})

const logseVirtualFctModule = computed(() => ({
  code: '__LOGSE_FCT__',
  name: 'FCT',
  courseLevel: 2,
  numberOfHours: Number(pcc.value?.trainingPlan?.secondCourseHours) || 0,
  isVirtualFct: true
}))

const modulesByCourse = computed(() => {
  const grouped = {
    1: [],
    2: []
  }

  currentModules.value.forEach((module) => {
    const level = module.courseLevel || 1
    if (grouped[level]) {
      grouped[level].push(module)
    }
  })

  if (isLogseCycle.value) {
    grouped[2] = [logseVirtualFctModule.value]
  }

  return grouped
})

const regularModulesByCourse = computed(() => ({
  1: modulesByCourse.value[1].filter((module) => !isOptionalModule(module)),
  2: modulesByCourse.value[2].filter((module) => !isOptionalModule(module))
}))

const optionalModulesByCourse = computed(() => ({
  1: modulesByCourse.value[1].filter(isOptionalModule),
  2: modulesByCourse.value[2].filter(isOptionalModule)
}))

const getOptionalHours = (courseLevel) => {
  return optionalModulesByCourse.value[courseLevel][0]?.numberOfHours || 0
}

const hasOptionalHoursWarning = (courseLevel) => {
  const optionalModules = optionalModulesByCourse.value[courseLevel]
  if (optionalModules.length < 2) return false

  const firstModule = optionalModules[0]
  return optionalModules.slice(1).some((module) => {
    return (
      Number(module.numberOfHours || 0) !== Number(firstModule.numberOfHours || 0) ||
      Number(module.weekHours || 0) !== Number(firstModule.weekHours || 0)
    )
  })
}

const addedModulesHoursByCourse = computed(() => {
  return {
    1:
      regularModulesByCourse.value[1].reduce(
        (total, module) => total + (module.numberOfHours || 0),
        0
      ) + getOptionalHours(1),
    2:
      regularModulesByCourse.value[2].reduce(
        (total, module) => total + (module.numberOfHours || 0),
        0
      ) + getOptionalHours(2)
  }
})

const addedModulesHours = computed(() => {
  return addedModulesHoursByCourse.value[1] + addedModulesHoursByCourse.value[2]
})

const cycleHoursFallback = computed(() => {
  return !(cycle.value?.hours || pcc.value?.cycle?.hours)
})

const cycleTotalHours = computed(() => {
  if (cycle.value?.hours) return cycle.value.hours
  if (pcc.value?.cycle?.hours) return pcc.value.cycle.hours
  return 0
})

const getModulesCollection = (source) => {
  if (Array.isArray(source?.modules)) return source.modules
  if (Array.isArray(source?.modules?.['hydra:member'])) return source.modules['hydra:member']
  if (Array.isArray(source?.modules?.member)) return source.modules.member
  if (Array.isArray(source?.['hydra:member'])) return source['hydra:member']
  if (Array.isArray(source?.member)) return source.member
  if (Array.isArray(source)) return source
  return []
}

const cycleModules = computed(() => {
  const loadedCycleModules = getModulesCollection(cycle.value)
  if (loadedCycleModules.length > 0) return loadedCycleModules

  return getModulesCollection(pcc.value?.cycle)
})

const hasCycleModulesLoaded = computed(() => cycleModules.value.length > 0)

const isCycleModulesPending = computed(
  () => isLoadingCycle.value || (!hasTriedLoadingCycle.value && !hasCycleModulesLoaded.value)
)

const availableModulesToAdd = computed(() => {
  if (!hasCycleModulesLoaded.value) return []

  const currentModuleCodes = currentModules.value.map((m) => String(m.code))
  let modules = cycleModules.value.filter((m) => !currentModuleCodes.includes(String(m.code)))

  if (isLogseCycle.value) {
    modules = modules.filter((m) => (m.courseLevel || 1) === 1)
  }

  return modules
})

const hasModulesToAdd = computed(() => availableModulesToAdd.value.length > 0)

const availableModulesByCourse = computed(() => {
  const grouped = {
    1: [],
    2: []
  }

  availableModulesToAdd.value.forEach((module) => {
    const level = module.courseLevel || 1
    if (grouped[level]) {
      grouped[level].push(module)
    }
  })

  return grouped
})

const availableRegularModulesByCourse = computed(() => ({
  1: availableModulesByCourse.value[1].filter((module) => !isOptionalModule(module)),
  2: availableModulesByCourse.value[2].filter((module) => !isOptionalModule(module))
}))

const availableOptionalModulesByCourse = computed(() => ({
  1: availableModulesByCourse.value[1].filter(isOptionalModule),
  2: availableModulesByCourse.value[2].filter(isOptionalModule)
}))

// Métodos
const openAddModal = () => {
  selectedModulesToAdd.value = []
  showAddModal.value = true
}

const closeAddModal = () => {
  showAddModal.value = false
  selectedModulesToAdd.value = []
}

const openDeleteModal = (module) => {
  if (module?.isVirtualFct) return
  moduleToDelete.value = module
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  moduleToDelete.value = null
}

const toggleModuleSelection = (moduleCode) => {
  const index = selectedModulesToAdd.value.indexOf(moduleCode)
  if (index > -1) {
    selectedModulesToAdd.value.splice(index, 1)
  } else {
    selectedModulesToAdd.value.push(moduleCode)
  }
}

const isModuleSelected = (moduleCode) => {
  return selectedModulesToAdd.value.includes(moduleCode)
}

const addModules = async () => {
  if (selectedModulesToAdd.value.length === 0) {
    store.addMessage('info', 'Selecciona almenys un mòdul per afegir')
    return
  }

  isLoading.value = true
  try {
    const success = await addModuleToPCC(props.pccId, selectedModulesToAdd.value)
    if (success) {
      closeAddModal()
      store.addMessage('success', 'Mòduls afegits correctament')
    }
  } catch (error) {
    store.addMessage('error', 'Error en afegir els mòduls')
  } finally {
    isLoading.value = false
  }
}

const confirmDelete = async () => {
  if (!moduleToDelete.value) return

  isLoading.value = true
  try {
    const success = await removeModuleFromPCC(props.pccId, moduleToDelete.value.code)
    if (success) {
      closeDeleteModal()
      store.addMessage('success', 'Mòdul eliminat correctament')
    }
  } catch (error) {
    store.addMessage('error', 'Error en eliminar el mòdul')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="card text-center mb-2">
    <div
      class="card-header pcc fw-bold text-uppercase text-white text-start d-flex justify-content-between align-items-center"
    >
      <div>1.1 Mòduls del PCC</div>
    </div>

    <div class="card-body text-start pb-0">
      <p class="text-muted mb-3">
        Has d'indicar tots els mòduls que s'inclouen al cicle formatiu. Recorda que d'un any a altre
        pot canviar el mòdul optatiu.
      </p>
    </div>

    <!-- Lista de módulos actuales dividida por curso -->
    <div v-if="currentModules.length > 0" class="row g-3 text-start">
      <!-- 1º Curso -->
      <div class="col-12 col-lg-6">
        <div class="card h-100">
          <div class="card-header bg-secondary text-white fw-bold">
            <i class="bi bi-journal-text me-2"></i>
            1r Curs
            <span class="badge bg-light text-dark ms-2">
              Total hores afegides: {{ addedModulesHoursByCourse[1] }} h
            </span>
          </div>
          <ul class="list-group list-group-flush">
            <li
              v-if="modulesByCourse[1].length === 0"
              class="list-group-item text-muted text-center"
            >
              <i class="bi bi-info-circle me-1"></i>
              No hi ha mòduls de 1r curs
            </li>
            <li
              v-for="module in regularModulesByCourse[1]"
              :key="module.code"
              class="list-group-item d-flex justify-content-between align-items-center"
            >
              <div class="flex-grow-1">
                <strong>{{ module.code }}</strong> - {{ module.name }} ({{ module.numberOfHours }}
                 h)
                <span v-if="module.proyect" class="badge bg-info text-dark ms-2">Projecte</span>
                <span v-if="getOptionalTurnRestriction(module)" class="badge bg-warning text-dark ms-2">
                  Només {{ getOptionalTurnRestriction(module) }}
                </span>
              </div>
              <button
                @click="openDeleteModal(module)"
                class="btn btn-danger btn-sm ms-2"
                :disabled="isLoading"
                title="Eliminar mòdul"
              >
                <i class="bi bi-trash"></i>
              </button>
            </li>
            <li v-if="optionalModulesByCourse[1].length > 0" class="list-group-item optional-modules">
              <div class="fw-bold text-primary mb-2">
                <i class="bi bi-bookmark-star me-1"></i>
                Mòduls optatius
                <span class="badge bg-secondary ms-1">{{ getOptionalHours(1) }} h</span>
              </div>
              <div
                v-if="hasOptionalHoursWarning(1)"
                class="alert alert-warning small py-2 mb-2"
              >
                Els mòduls optatius han de tenir les mateixes hores. Per al còmput es fan servir les
                hores del primer mòdul afegit.
              </div>
              <div
                v-for="module in optionalModulesByCourse[1]"
                :key="module.code"
                class="d-flex justify-content-between align-items-center py-1"
              >
                <div>
                  <strong>{{ module.code }}</strong> - {{ module.name }} ({{ module.numberOfHours }} h)
                  <span v-if="getOptionalTurnRestriction(module)" class="badge bg-warning text-dark ms-2">
                    Només {{ getOptionalTurnRestriction(module) }}
                  </span>
                </div>
                <button
                  @click="openDeleteModal(module)"
                  class="btn btn-danger btn-sm ms-2"
                  :disabled="isLoading"
                  title="Eliminar mòdul"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- 2º Curso -->
      <div class="col-12 col-lg-6">
        <div class="card h-100">
          <div class="card-header bg-secondary text-white fw-bold">
            <i class="bi bi-journal-text me-2"></i>
            2n Curs
            <span class="badge bg-light text-dark ms-2">
              Total hores afegides: {{ addedModulesHoursByCourse[2] }} h
            </span>
          </div>
          <ul class="list-group list-group-flush">
            <li
              v-if="modulesByCourse[2].length === 0"
              class="list-group-item text-muted text-center"
            >
              <i class="bi bi-info-circle me-1"></i>
              No hi ha mòduls de 2n curs
            </li>
            <li
              v-for="module in regularModulesByCourse[2]"
              :key="module.code"
              class="list-group-item d-flex justify-content-between align-items-center"
            >
              <div class="flex-grow-1">
                <template v-if="module.isVirtualFct">
                  <strong>{{ module.name }}</strong>
                  <span class="badge bg-warning text-dark ms-2">Pas 5</span>
                  <div class="small text-muted mt-1">
                    <span v-if="module.numberOfHours > 0"
                      >{{ module.numberOfHours }} h definides al pas 5</span
                    >
                    <span v-else>Pendent de definir hores al pas 5 (Pla Formatiu d'Empresa)</span>
                  </div>
                </template>
                <template v-else>
                  <strong>{{ module.code }}</strong> - {{ module.name }} ({{ module.numberOfHours }}
                  h)
                  <span v-if="module.proyect" class="badge bg-info text-dark ms-2">Projecte</span>
                  <span v-if="getOptionalTurnRestriction(module)" class="badge bg-warning text-dark ms-2">
                    Només {{ getOptionalTurnRestriction(module) }}
                  </span>
                </template>
              </div>
              <button
                v-if="!module.isVirtualFct"
                @click="openDeleteModal(module)"
                class="btn btn-danger btn-sm ms-2"
                :disabled="isLoading"
                title="Eliminar mòdul"
              >
                <i class="bi bi-trash"></i>
              </button>
            </li>
            <li v-if="optionalModulesByCourse[2].length > 0" class="list-group-item optional-modules">
              <div class="fw-bold text-success mb-2">
                <i class="bi bi-bookmark-star me-1"></i>
                Mòduls optatius
                <span class="badge bg-secondary ms-1">{{ getOptionalHours(2) }} h</span>
              </div>
              <div
                v-if="hasOptionalHoursWarning(2)"
                class="alert alert-warning small py-2 mb-2"
              >
                Els mòduls optatius han de tenir les mateixes hores. Per al còmput es fan servir les
                hores del primer mòdul afegit.
              </div>
              <div
                v-for="module in optionalModulesByCourse[2]"
                :key="module.code"
                class="d-flex justify-content-between align-items-center py-1"
              >
                <div>
                  <strong>{{ module.code }}</strong> - {{ module.name }} ({{ module.numberOfHours }} h)
                  <span v-if="getOptionalTurnRestriction(module)" class="badge bg-warning text-dark ms-2">
                    Només {{ getOptionalTurnRestriction(module) }}
                  </span>
                </div>
                <button
                  @click="openDeleteModal(module)"
                  class="btn btn-danger btn-sm ms-2"
                  :disabled="isLoading"
                  title="Eliminar mòdul"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-else class="alert alert-info">
      <i class="bi bi-info-circle me-2"></i>
      No hi ha mòduls associats a aquest PCC
    </div>

    <div class="d-flex flex-column align-items-center gap-2 mt-3">
      <button
        @click="openAddModal"
        class="btn btn-primary"
        :disabled="isLoading || isCycleModulesPending || !hasCycleModulesLoaded || !hasModulesToAdd"
      >
        <span v-if="isCycleModulesPending" class="spinner-border spinner-border-sm me-1"></span>
        <i v-else class="bi bi-plus-circle me-1"></i>
        {{ isCycleModulesPending ? 'Carregant mòduls...' : 'Afegir mòduls' }}
      </button>
      <div v-if="!isCycleModulesPending && !hasCycleModulesLoaded" class="alert alert-warning mb-0 py-2">
        <i class="bi bi-exclamation-triangle me-1"></i>
        No s'han pogut carregar els mòduls del cicle.
      </div>
      <div v-else-if="!isCycleModulesPending && !hasModulesToAdd" class="alert alert-info mb-0 py-2">
        <i class="bi bi-info-circle me-1"></i>
        Tots els mòduls disponibles del cicle ja estan afegits al PCC.
      </div>
      <div class="text-muted">
        Hores totals mòduls afegits: <strong>{{ addedModulesHours }}</strong> /
        <span :class="{ 'text-danger': cycleHoursFallback }">{{ cycleTotalHours }}</span>
      </div>
    </div>

    <!-- Modal para añadir módulos -->
    <Teleport to="body">
      <div v-if="showAddModal">
        <div class="modal d-block" tabindex="-1">
          <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content">
              <div class="modal-header bg-primary text-white">
                <h5 class="modal-title">
                  <i class="bi bi-plus-circle me-2"></i>
                  Afegir mòduls al PCC
                </h5>
                <button
                  type="button"
                  class="btn-close btn-close-white"
                  @click="closeAddModal"
                  aria-label="Close"
                ></button>
              </div>
              <div class="modal-body">
                <p class="text-muted mb-3">
                  Selecciona els mòduls que vols afegir al Projecte Curricular de Centre:
                </p>
                <div v-if="availableModulesToAdd.length > 0" class="module-list">
                  <!-- 1º Curso -->
                  <div v-if="availableModulesByCourse[1].length > 0" class="mb-3">
                    <h6 class="text-primary fw-bold mb-2">
                      <i class="bi bi-journal-text me-1"></i>
                      1r Curs
                    </h6>
                    <div
                      v-for="module in availableRegularModulesByCourse[1]"
                      :key="module.code"
                      class="form-check mb-2 p-3 border rounded d-flex align-items-center gap-2"
                      :class="{ 'bg-light': isModuleSelected(module.code) }"
                    >
                      <input
                        class="form-check-input module-checkbox"
                        type="checkbox"
                        :id="`module-${module.code}`"
                        :value="module.code"
                        :checked="isModuleSelected(module.code)"
                        @change="toggleModuleSelection(module.code)"
                      />
                      <label
                        class="form-check-label w-100 cursor-pointer module-label"
                        :for="`module-${module.code}`"
                        :title="`${module.code} - ${module.name}`"
                      >
                        <strong>{{ module.code }}</strong> - {{ module.name }}
                        <span v-if="module.proyect" class="badge bg-info text-dark ms-2"
                          >Projecte</span
                        >
                      </label>
                    </div>
                    <div v-if="availableOptionalModulesByCourse[1].length > 0" class="optional-modules mt-3">
                      <div class="fw-bold text-primary mb-2">
                        <i class="bi bi-bookmark-star me-1"></i>Mòduls optatius
                      </div>
                      <div
                        v-for="module in availableOptionalModulesByCourse[1]"
                        :key="module.code"
                        class="form-check mb-2 p-3 border rounded d-flex align-items-center gap-2"
                        :class="{ 'bg-light': isModuleSelected(module.code) }"
                      >
                        <input
                          class="form-check-input module-checkbox"
                          type="checkbox"
                          :id="`module-${module.code}`"
                          :value="module.code"
                          :checked="isModuleSelected(module.code)"
                          @change="toggleModuleSelection(module.code)"
                        />
                        <label
                          class="form-check-label w-100 cursor-pointer module-label"
                          :for="`module-${module.code}`"
                          :title="`${module.code} - ${module.name}`"
                        >
                          <strong>{{ module.code }}</strong> - {{ module.name }} ({{ module.numberOfHours }} h)
                        </label>
                      </div>
                    </div>
                  </div>

                  <!-- 2º Curso -->
                  <div v-if="!isLogseCycle && availableModulesByCourse[2].length > 0">
                    <h6 class="text-success fw-bold mb-2">
                      <i class="bi bi-journal-text me-1"></i>
                      2n Curs
                    </h6>
                    <div
                      v-for="module in availableRegularModulesByCourse[2]"
                      :key="module.code"
                      class="form-check mb-2 p-3 border rounded d-flex align-items-center gap-2"
                      :class="{ 'bg-light': isModuleSelected(module.code) }"
                    >
                      <input
                        class="form-check-input module-checkbox"
                        type="checkbox"
                        :id="`module-${module.code}`"
                        :value="module.code"
                        :checked="isModuleSelected(module.code)"
                        @change="toggleModuleSelection(module.code)"
                      />
                      <label
                        class="form-check-label w-100 cursor-pointer module-label"
                        :for="`module-${module.code}`"
                        :title="`${module.code} - ${module.name}`"
                      >
                        <strong>{{ module.code }}</strong> - {{ module.name }}
                        <span v-if="module.proyect" class="badge bg-info text-dark ms-2"
                          >Projecte</span
                        >
                      </label>
                    </div>
                    <div v-if="availableOptionalModulesByCourse[2].length > 0" class="optional-modules mt-3">
                      <div class="fw-bold text-success mb-2">
                        <i class="bi bi-bookmark-star me-1"></i>Mòduls optatius
                      </div>
                      <div
                        v-for="module in availableOptionalModulesByCourse[2]"
                        :key="module.code"
                        class="form-check mb-2 p-3 border rounded d-flex align-items-center gap-2"
                        :class="{ 'bg-light': isModuleSelected(module.code) }"
                      >
                        <input
                          class="form-check-input module-checkbox"
                          type="checkbox"
                          :id="`module-${module.code}`"
                          :value="module.code"
                          :checked="isModuleSelected(module.code)"
                          @change="toggleModuleSelection(module.code)"
                        />
                        <label
                          class="form-check-label w-100 cursor-pointer module-label"
                          :for="`module-${module.code}`"
                          :title="`${module.code} - ${module.name}`"
                        >
                          <strong>{{ module.code }}</strong> - {{ module.name }} ({{ module.numberOfHours }} h)
                        </label>
                      </div>
                    </div>
                  </div>
                  <div v-if="isLogseCycle" class="alert alert-info mt-3 mb-0">
                    En els cicles LOGSE, l'FCT es gestiona automàticament al pas 5 (Pla Formatiu
                    d'Empresa).
                  </div>
                </div>
                <div v-else class="alert alert-warning">
                  <i class="bi bi-exclamation-triangle me-2"></i>
                  Tots els mòduls del cicle ja estan afegits al PCC
                </div>
              </div>
              <div class="modal-footer">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="closeAddModal"
                  :disabled="isLoading"
                >
                  <i class="bi bi-x-circle me-1"></i>
                  Cancel·lar
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  @click="addModules"
                  :disabled="isLoading || selectedModulesToAdd.length === 0"
                >
                  <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-check-circle me-1"></i>
                  Afegir
                  {{ selectedModulesToAdd.length > 0 ? `(${selectedModulesToAdd.length})` : '' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show" @click="closeAddModal"></div>
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
                <div class="alert alert-warning mb-3">
                  <strong>
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Atenció: Impacte global
                  </strong>
                  <p class="mt-2 mb-0">
                    En eliminar aquest mòdul del PCC, desapareixerà de
                    <strong>tots els apartats i elements vinculats</strong>
                    (metodologia, avaluació, etc.).
                  </p>
                </div>
                <p class="mb-2">Estàs segur que vols eliminar el mòdul:</p>
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
                  Eliminar mòdul
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
.cursor-pointer {
  cursor: pointer;
}

.form-check {
  transition: background-color 0.2s;
}

.form-check:hover {
  background-color: #f8f9fa !important;
}

.module-list {
  max-height: 400px;
  overflow-y: auto;
}

.module-label {
  flex: 1;
  min-width: 0;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.module-list .form-check {
  padding-left: 0;
}

.optional-modules {
  border-left: 4px solid #ffc107;
  background-color: #fffdf2;
}

.module-checkbox {
  margin-left: 0;
  margin-top: 0;
}

.pcc-module-manager {
  margin-bottom: 1.5rem;
}
</style>
