<script setup>
import { ref, reactive, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/stores/data'

const props = defineProps({
  pccId: {
    type: Number,
    required: true
  }
})

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)
const {
  savePCCIntermodularGuide,
  savePCCIntermodularOrientation,
  deletePCCIntermodularOrientation
} = store

// State
const isLoading = ref(false)
const showOrientationModal = ref(false)
const orientationForm = reactive({
  moduleCode: '',
  moduleName: '',
  learningResultId: null,
  learningResultNumber: null,
  supportActivitiesGuidance: ''
})

// Temporalization form
const tempForm = reactive({
  firstCourse: {
    temporalizationOption: '',
    temporalizationDetails: '',
    weight: null
  },
  secondCourse: {
    temporalizationOption: '',
    temporalizationDetails: '',
    weight: null
  }
})

// Temporalization options
const tempOptions = [
  { value: 'center_attendance', label: 'Assistència al centre' },
  { value: 'before_fe_week', label: 'Abans de la setmana de FE' },
  { value: 'after_fe_week', label: 'Després de la setmana de FE' }
]

// Computeds
const guide = computed(() => pcc.value?.intermodularProjectGuide || null)

const hasProjectCourse1 = computed(() => {
  return (pcc.value?.modules || []).some(m => m.proyect && m.courseLevel === 1)
})

const hasProjectCourse2 = computed(() => {
  return (pcc.value?.modules || []).some(m => m.proyect && m.courseLevel === 2)
})

const nonProjectModulesByCourse = computed(() => {
  const grouped = { 1: [], 2: [] }
  const modules = pcc.value?.modules || []
  modules.forEach(m => {
    if (!m.proyect) {
      const level = m.courseLevel || 1
      if (grouped[level]) grouped[level].push(m)
    }
  })
  return grouped
})

const orientations = computed(() => {
  return guide.value?.orientations || []
})

// Initialize form from existing data
const initTempForm = () => {
  const g = guide.value
  if (g?.firstCourse) {
    tempForm.firstCourse.temporalizationOption = g.firstCourse.temporalizationOption || ''
    tempForm.firstCourse.temporalizationDetails = g.firstCourse.temporalizationDetails || ''
    tempForm.firstCourse.weight = g.firstCourse.weight ?? null
  }
  if (g?.secondCourse) {
    tempForm.secondCourse.temporalizationOption = g.secondCourse.temporalizationOption || ''
    tempForm.secondCourse.temporalizationDetails = g.secondCourse.temporalizationDetails || ''
    tempForm.secondCourse.weight = g.secondCourse.weight ?? null
  }
}

// Initialize on component creation
initTempForm()

// Methods
const saveGuide = async () => {
  isLoading.value = true
  try {
    const data = {}
    if (hasProjectCourse1.value) {
      data.firstCourse = {
        temporalizationOption: tempForm.firstCourse.temporalizationOption,
        temporalizationDetails: tempForm.firstCourse.temporalizationDetails,
        weight: tempForm.firstCourse.weight
      }
    }
    if (hasProjectCourse2.value) {
      data.secondCourse = {
        temporalizationOption: tempForm.secondCourse.temporalizationOption,
        temporalizationDetails: tempForm.secondCourse.temporalizationDetails,
        weight: tempForm.secondCourse.weight
      }
    }
    const result = await savePCCIntermodularGuide(props.pccId, data)
    if (result === 'ok') {
      initTempForm()
    }
  } finally {
    isLoading.value = false
  }
}

const getOrientationsForModule = (moduleCode) => {
  return orientations.value.filter(o => o.moduleCode === moduleCode)
}

const getOrientationForLR = (moduleCode, lrId) => {
  return orientations.value.find(o => o.moduleCode === moduleCode && o.learningResultId === lrId)
}

const openOrientationModal = (module, lr) => {
  const existing = getOrientationForLR(module.code, lr.id)
  orientationForm.moduleCode = module.code
  orientationForm.moduleName = module.name
  orientationForm.learningResultId = lr.id
  orientationForm.learningResultNumber = lr.number
  orientationForm.supportActivitiesGuidance = existing?.supportActivitiesGuidance || ''
  showOrientationModal.value = true
}

const closeOrientationModal = () => {
  showOrientationModal.value = false
  orientationForm.moduleCode = ''
  orientationForm.moduleName = ''
  orientationForm.learningResultId = null
  orientationForm.learningResultNumber = null
  orientationForm.supportActivitiesGuidance = ''
}

const saveOrientation = async () => {
  if (!orientationForm.supportActivitiesGuidance.trim()) return

  isLoading.value = true
  try {
    const result = await savePCCIntermodularOrientation(props.pccId, {
      moduleCode: orientationForm.moduleCode,
      learningResultId: orientationForm.learningResultId,
      supportActivitiesGuidance: orientationForm.supportActivitiesGuidance
    })
    if (result === 'ok') {
      closeOrientationModal()
    }
  } finally {
    isLoading.value = false
  }
}

const deleteOrientation = async (moduleCode, learningResultId) => {
  if (!confirm('Segur que vols eliminar aquesta orientació?')) return

  isLoading.value = true
  try {
    await deletePCCIntermodularOrientation(props.pccId, moduleCode, learningResultId)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="pcc-intermodular-guide">
    <!-- 8.1 Temporalització -->
    <div class="card mb-3">
      <div class="card-header pcc fw-bold text-uppercase text-white text-start">
        8.1 Temporalització i pes del Projecte Intermodular
      </div>
      <div class="card-body">
        <div v-if="!hasProjectCourse1 && !hasProjectCourse2" class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>
          No hi ha mòduls de projecte intermodular en aquest PCC.
        </div>

        <div class="row g-4">
          <!-- 1r Curs -->
          <div v-if="hasProjectCourse1" class="col-12 col-lg-6">
            <div class="card h-100">
              <div class="card-header bg-secondary text-white fw-bold">
                <i class="bi bi-journal-text me-2"></i>
                Projecte Intermodular - 1r Curs
              </div>
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label fw-bold">Temporalització</label>
                  <select v-model="tempForm.firstCourse.temporalizationOption" class="form-select">
                    <option value="">-- Selecciona --</option>
                    <option v-for="opt in tempOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold">Observacions sobre la temporalització</label>
                  <textarea v-model="tempForm.firstCourse.temporalizationDetails"
                    class="form-control" rows="3"
                    placeholder="Detalls addicionals sobre la temporalització..."></textarea>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold">Pes (%)</label>
                  <input type="number" v-model.number="tempForm.firstCourse.weight"
                    class="form-control" min="0" max="100" placeholder="Percentatge del projecte">
                </div>
              </div>
            </div>
          </div>

          <!-- 2n Curs -->
          <div v-if="hasProjectCourse2" class="col-12 col-lg-6">
            <div class="card h-100">
              <div class="card-header bg-secondary text-white fw-bold">
                <i class="bi bi-journal-text me-2"></i>
                Projecte Intermodular - 2n Curs
              </div>
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label fw-bold">Temporalització</label>
                  <select v-model="tempForm.secondCourse.temporalizationOption" class="form-select">
                    <option value="">-- Selecciona --</option>
                    <option v-for="opt in tempOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold">Observacions sobre la temporalització</label>
                  <textarea v-model="tempForm.secondCourse.temporalizationDetails"
                    class="form-control" rows="3"
                    placeholder="Detalls addicionals sobre la temporalització..."></textarea>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold">Pes (%)</label>
                  <input type="number" v-model.number="tempForm.secondCourse.weight"
                    class="form-control" min="0" max="100" placeholder="Percentatge del projecte">
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="hasProjectCourse1 || hasProjectCourse2" class="text-end mt-3">
          <button @click="saveGuide" class="btn btn-success" :disabled="isLoading">
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-check-circle me-1"></i>
            Guardar temporalització
          </button>
        </div>
      </div>
    </div>

    <!-- 8.2 Orientacions per mòdul -->
    <div class="card mb-3">
      <div class="card-header pcc fw-bold text-uppercase text-white text-start">
        8.2 Orientacions per mòdul per al Projecte Intermodular
      </div>
      <div class="card-body">
        <template v-for="course in [1, 2]" :key="course">
          <div v-if="nonProjectModulesByCourse[course].length > 0" class="mb-4">
            <h5 class="fw-bold text-secondary">
              <i class="bi bi-journal-text me-2"></i>
              {{ course === 1 ? '1r Curs' : '2n Curs' }}
            </h5>

            <div class="accordion" :id="`accordion-course-${course}`">
              <div v-for="module in nonProjectModulesByCourse[course]" :key="module.code"
                class="accordion-item">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed" type="button"
                    data-bs-toggle="collapse" :data-bs-target="`#collapse-${module.code}`">
                    <strong>{{ module.code }}</strong>
                    <span class="ms-2">{{ module.name }}</span>
                    <span v-if="getOrientationsForModule(module.code).length > 0"
                      class="badge bg-success ms-2">
                      {{ getOrientationsForModule(module.code).length }} orientació/ns
                    </span>
                  </button>
                </h2>
                <div :id="`collapse-${module.code}`" class="accordion-collapse collapse">
                  <div class="accordion-body p-2">
                    <table class="table table-sm table-bordered align-middle mb-0">
                      <thead class="table-light">
                        <tr>
                          <th style="width: 80px;">RA</th>
                          <th>Descriptor</th>
                          <th style="width: 280px;">Orientació</th>
                          <th style="width: 100px;" class="text-center">Accions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="lr in module.learningResults" :key="lr.id">
                          <td class="fw-bold text-center">RA{{ lr.number }}</td>
                          <td class="small">{{ lr.descriptor }}</td>
                          <td>
                            <span v-if="getOrientationForLR(module.code, lr.id)" class="small">
                              {{ getOrientationForLR(module.code, lr.id).supportActivitiesGuidance }}
                            </span>
                            <span v-else class="text-muted small fst-italic">Sense orientació</span>
                          </td>
                          <td class="text-center">
                            <button @click="openOrientationModal(module, lr)"
                              class="btn btn-sm btn-primary me-1" :disabled="isLoading"
                              :title="getOrientationForLR(module.code, lr.id) ? 'Modificar' : 'Afegir'">
                              <i :class="getOrientationForLR(module.code, lr.id) ? 'bi bi-pencil' : 'bi bi-plus-circle'"></i>
                            </button>
                            <button v-if="getOrientationForLR(module.code, lr.id)"
                              @click="deleteOrientation(module.code, lr.id)"
                              class="btn btn-sm btn-danger" :disabled="isLoading" title="Eliminar">
                              <i class="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                        <tr v-if="!module.learningResults || module.learningResults.length === 0">
                          <td colspan="4" class="text-center text-muted">
                            Aquest mòdul no té resultats d'aprenentatge
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Modal orientació -->
    <Teleport to="body">
      <div v-if="showOrientationModal">
        <div class="modal d-block" tabindex="-1">
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-primary text-white">
                <h5 class="modal-title">
                  <i class="bi bi-pencil-square me-2"></i>
                  Orientació per a {{ orientationForm.moduleCode }} - RA{{ orientationForm.learningResultNumber }}
                </h5>
                <button type="button" class="btn-close btn-close-white" @click="closeOrientationModal"></button>
              </div>
              <div class="modal-body">
                <p class="text-muted">
                  Mòdul: <strong>{{ orientationForm.moduleCode }} - {{ orientationForm.moduleName }}</strong>
                </p>
                <div class="mb-3">
                  <label class="form-label fw-bold">
                    Activitats de suport i orientació per a RA{{ orientationForm.learningResultNumber }}
                  </label>
                  <textarea v-model="orientationForm.supportActivitiesGuidance"
                    class="form-control" rows="5"
                    placeholder="Descriu les activitats de suport i orientació proposades..."></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeOrientationModal" :disabled="isLoading">
                  Cancel·lar
                </button>
                <button type="button" class="btn btn-primary" @click="saveOrientation"
                  :disabled="isLoading || !orientationForm.supportActivitiesGuidance.trim()">
                  <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show" @click="closeOrientationModal"></div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.accordion-button:not(.collapsed) {
  background-color: #e7f1ff;
}
</style>
