<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/stores/data'
import ModalComponent from '@/components/ModalComp.vue'

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

// Estado local
const isLoading = ref(false)
const selectedModulesToAdd = ref([])
const moduleToDelete = ref(null)
const showAddModal = ref(false)
const showDeleteModal = ref(false)

// Cargar ciclo si no está disponible
onMounted(async () => {
  if (pcc.value?.cycle?.id && (!cycle.value?.id || cycle.value.id !== pcc.value.cycle.id)) {
    await fetchCycle(pcc.value.cycle.id)
  }
})

// Computeds
const currentModules = computed(() => {
  return pcc.value?.modules || []
})

const modulesByCourse = computed(() => {
  const grouped = {
    1: [],
    2: []
  }

  currentModules.value.forEach(module => {
    const level = module.courseLevel || 1
    if (grouped[level]) {
      grouped[level].push(module)
    }
  })

  return grouped
})

const availableModulesToAdd = computed(() => {
  if (!cycle.value?.modules) return []

  const currentModuleCodes = currentModules.value.map(m => m.code)
  return cycle.value.modules.filter(m => !currentModuleCodes.includes(m.code))
})

const hasModulesToAdd = computed(() => availableModulesToAdd.value.length > 0)

const availableModulesByCourse = computed(() => {
  const grouped = {
    1: [],
    2: []
  }

  availableModulesToAdd.value.forEach(module => {
    const level = module.courseLevel || 1
    if (grouped[level]) {
      grouped[level].push(module)
    }
  })

  return grouped
})

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
        <div class="card-header pcc fw-bold text-uppercase text-white text-start">
        1.1 Mòduls del PCC
      <button
        v-if="hasModulesToAdd"
        @click="openAddModal"
        class="btn btn-primary btn-sm"
        :disabled="isLoading"
      >
        <i class="bi bi-plus-circle me-1"></i>
        Afegir mòduls
      </button>
    </div>

    <!-- Lista de módulos actuales dividida por curso -->
    <div v-if="currentModules.length > 0" class="row g-3">
      <!-- 1º Curso -->
      <div class="col-12 col-lg-6">
        <div class="card h-100">
          <div class="card-header bg-secondary text-white fw-bold">
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
            <li
              v-for="module in modulesByCourse[1]"
              :key="module.code"
              class="list-group-item d-flex justify-content-between align-items-center"
            >
              <div class="flex-grow-1">
                <strong>{{ module.code }}</strong> - {{ module.name }}
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
          </ul>
        </div>
      </div>

      <!-- 2º Curso -->
      <div class="col-12 col-lg-6">
        <div class="card h-100">
          <div class="card-header bg-secondary text-white fw-bold">
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
            <li
              v-for="module in modulesByCourse[2]"
              :key="module.code"
              class="list-group-item d-flex justify-content-between align-items-center"
            >
              <div class="flex-grow-1">
                <strong>{{ module.code }}</strong> - {{ module.name }}
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
          </ul>
        </div>
      </div>
    </div>

    <div v-else class="alert alert-info">
      <i class="bi bi-info-circle me-2"></i>
      No hi ha mòduls associats a aquest PCC
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
                      v-for="module in availableModulesByCourse[1]"
                      :key="module.code"
                      class="form-check mb-2 p-3 border rounded"
                      :class="{ 'bg-light': isModuleSelected(module.code) }"
                    >
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :id="`module-${module.code}`"
                        :value="module.code"
                        :checked="isModuleSelected(module.code)"
                        @change="toggleModuleSelection(module.code)"
                      >
                      <label
                        class="form-check-label w-100 cursor-pointer"
                        :for="`module-${module.code}`"
                      >
                        <strong>{{ module.code }}</strong> - {{ module.name }}
                      </label>
                    </div>
                  </div>

                  <!-- 2º Curso -->
                  <div v-if="availableModulesByCourse[2].length > 0">
                    <h6 class="text-success fw-bold mb-2">
                      <i class="bi bi-journal-text me-1"></i>
                      2n Curs
                    </h6>
                    <div
                      v-for="module in availableModulesByCourse[2]"
                      :key="module.code"
                      class="form-check mb-2 p-3 border rounded"
                      :class="{ 'bg-light': isModuleSelected(module.code) }"
                    >
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :id="`module-${module.code}`"
                        :value="module.code"
                        :checked="isModuleSelected(module.code)"
                        @change="toggleModuleSelection(module.code)"
                      >
                      <label
                        class="form-check-label w-100 cursor-pointer"
                        :for="`module-${module.code}`"
                      >
                        <strong>{{ module.code }}</strong> - {{ module.name }}
                      </label>
                    </div>
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
                  Afegir {{ selectedModulesToAdd.length > 0 ? `(${selectedModulesToAdd.length})` : '' }}
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
                    En eliminar aquest mòdul del PCC, desapareixerà de <strong>tots els apartats i elements vinculats</strong>
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

.pcc-module-manager {
  margin-bottom: 1.5rem;
}
</style>
