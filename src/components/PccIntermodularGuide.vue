<script setup>
import { ref, reactive, computed, watch } from 'vue'
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
const { pcc, cycle } = storeToRefs(store)
const {
  savePCCIntermodularGuide,
  savePCCIntermodularOrientation,
  deletePCCIntermodularOrientation
} = store

// State
const isLoading = ref(false)
const showOrientationModal = ref(false)
const showHelp = ref(false)
const showHelpOrientations = ref(false)
const orientationForm = reactive({
  projectModuleCode: '',
  projectModuleName: '',
  courseLevel: null,
  learningResultId: null,
  learningResultNumber: null,
  relatedModuleCode: '',
  supportActivitiesGuidance: '',
  editingModuleCode: ''
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

const validationErrors = ref({})
const getFieldErrors = (path) => validationErrors.value[path] || []
const hasFieldError = (path) => getFieldErrors(path).length > 0
const resetValidationErrors = () => {
  validationErrors.value = {}
}

// Temporalization options
const tempOptions = [
  { value: 'center_attendance', label: 'Assistència al centre' },
  { value: 'before_fe_week', label: 'Abans de la setmana de FE' },
  { value: 'after_fe_week', label: 'Després de la setmana de FE' }
]

// Computeds
const guide = computed(() => pcc.value?.intermodularProjectGuide || null)

const hasProjectCourse1 = computed(() => {
  return (pcc.value?.modules || []).some((m) => m.proyect && m.courseLevel === 1)
})

const hasProjectCourse2 = computed(() => {
  return (pcc.value?.modules || []).some((m) => m.proyect && m.courseLevel === 2)
})

const weightTotal = computed(() => {
  let total = 0
  if (hasProjectCourse1.value) {
    total += Number(tempForm.firstCourse.weight || 0)
  }
  if (hasProjectCourse2.value) {
    total += Number(tempForm.secondCourse.weight || 0)
  }
  return total
})

const modulesByCode = computed(() => {
  const map = {}
  const modules = cycle.value?.modules || []
  modules.forEach((module) => {
    if (module.code) {
      map[module.code] = module
    }
  })
  return map
})

const mergeModuleWithCycle = (module) => {
  const cycleModule = modulesByCode.value[module.code]
  if (!cycleModule) return module
  const learningResults =
    module.learningResults && module.learningResults.length > 0
      ? module.learningResults
      : cycleModule.learningResults || []
  return {
    ...cycleModule,
    ...module,
    learningResults
  }
}

const nonProjectModulesByCourse = computed(() => {
  const grouped = { 1: [], 2: [] }
  const modules = pcc.value?.modules || []
  modules.forEach((m) => {
    if (!m.proyect) {
      const level = m.courseLevel || 1
      if (grouped[level]) grouped[level].push(mergeModuleWithCycle(m))
    }
  })
  return grouped
})

const projectModulesByCourse = computed(() => {
  const grouped = { 1: [], 2: [] }
  const modules = pcc.value?.modules || []
  modules.forEach((m) => {
    if (m.proyect) {
      const level = m.courseLevel || 1
      if (grouped[level]) grouped[level].push(mergeModuleWithCycle(m))
    }
  })
  return grouped
})

const orientations = computed(() => {
  return (
    pcc.value?.intermodularProjectModuleOrientations ||
    guide.value?.intermodularProjectModuleOrientations ||
    guide.value?.orientations ||
    []
  )
})

const helpContent = {
  title: 'Ajuda - 8.1 Temporalització i pes del Projecte Intermodular',
  body: 'En aquest apartat cal concretar l’organització del Projecte Intermodular i el seu pes en el conjunt del cicle.\n\nCal indicar:\n\n<div class="help-list"><ul><li>La ponderació entre primer i segon curs per al càlcul de la qualificació final del Projecte Intermodular.</li><li>Si el projecte es desenvolupa exclusivament en segon curs, la qualificació final correspondrà al 100% del segon curs.</li><li>L’organització durant la Formació en Empresa (FE): cal especificar si, mentre l’alumnat realitza la FE, ha d’assistir al centre per desenvolupar el projecte en el seu horari setmanal habitual, o si les hores es concentraran en un període determinat (abans d’iniciar la FE o en finalitzar-la).</li></ul></div>\n\nTambé es poden incloure altres observacions rellevants sobre la coordinació, el seguiment o qualsevol aspecte organitzatiu que facilite la seua implementació.'
}
const helpOrientationsContent = {
  title: 'Ajuda - 8.2 Orientacions per mòdul per a assolir els RA del Projecte Intermodular',
  body: 'En aquest apartat cal definir orientacions que servisquen de suport per a l’assoliment dels Resultats d’Aprenentatge (RA) del Projecte Intermodular.\n\nCada mòdul ha d’indicar quins tipus d’activitats, continguts o actuacions pot proposar, d’acord amb els seus propis Resultats d’Aprenentatge, per facilitar el desenvolupament del projecte.\n\nNo es tracta de repetir els RA del Projecte, sinó d’especificar quines aportacions pot fer cada mòdul per ajudar a assolir-los.\n\nPer exemple, si un RA del Projecte contempla la planificació d’activitats, els mòduls hauran de concretar quins tipus d’activitats, instruments o continguts poden aportar des del seu àmbit per facilitar i reforçar aquesta planificació.'
}
const helpParagraphs = computed(() => {
  if (!helpContent.body) return []
  return helpContent.body.split('\n\n').filter(Boolean)
})
const helpOrientationsParagraphs = computed(() => {
  if (!helpOrientationsContent.body) return []
  return helpOrientationsContent.body.split('\n\n').filter(Boolean)
})

const getModuleByCode = (moduleCode) => {
  return (
    modulesByCode.value[moduleCode] || (pcc.value?.modules || []).find((m) => m.code === moduleCode)
  )
}

const getModuleLabel = (moduleOrCode) => {
  if (!moduleOrCode) return ''
  if (typeof moduleOrCode === 'object') {
    const name = moduleOrCode.name || getModuleByCode(moduleOrCode.code)?.name || ''
    return name ? `${moduleOrCode.code} - ${name}` : `${moduleOrCode.code}`
  }
  const module = getModuleByCode(moduleOrCode)
  if (!module) return moduleOrCode
  return `${module.code} - ${module.name}`
}

// Initialize form from existing data
const initTempForm = () => {
  const g = guide.value
  const firstCourseGuide = g?.firstCourseGuide || g?.firstCourse
  if (firstCourseGuide) {
    tempForm.firstCourse.temporalizationOption = firstCourseGuide.temporalizationOption || ''
    tempForm.firstCourse.temporalizationDetails = firstCourseGuide.temporalizationDetails || ''
    tempForm.firstCourse.weight = firstCourseGuide.weight ?? null
  }
  const secondCourseGuide = g?.secondCourseGuide || g?.secondCourse
  if (secondCourseGuide) {
    tempForm.secondCourse.temporalizationOption = secondCourseGuide.temporalizationOption || ''
    tempForm.secondCourse.temporalizationDetails = secondCourseGuide.temporalizationDetails || ''
    tempForm.secondCourse.weight = secondCourseGuide.weight ?? null
  }
}

watch(
  guide,
  () => {
    initTempForm()
  },
  { immediate: true }
)

// Methods
const saveGuide = async () => {
  resetValidationErrors()
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
      resetValidationErrors()
      return
    }
    if (result?.response?.status === 422) {
      const violations = result.response.data?.violations || []
      const nextErrors = {}
      violations.forEach((violation) => {
        if (!nextErrors[violation.propertyPath]) {
          nextErrors[violation.propertyPath] = []
        }
        nextErrors[violation.propertyPath].push(violation.message)
      })
      validationErrors.value = nextErrors
    }
  } finally {
    isLoading.value = false
  }
}

const getOrientationsForProjectModule = (module) => {
  const learningResultIds = (module.learningResults || []).map((lr) => lr.id)
  return orientations.value.filter(
    (o) => o.learningResult?.id && learningResultIds.includes(o.learningResult.id)
  )
}

const getOrientationsForLR = (lrId) => {
  return orientations.value.filter((o) => o.learningResult?.id === lrId)
}

const getUsedModuleCodesForLR = (lrId) => {
  return getOrientationsForLR(lrId)
    .map((orientation) => orientation.module?.code)
    .filter(Boolean)
}

const openOrientationModal = (module, lr, orientation = null) => {
  orientationForm.projectModuleCode = module.code
  orientationForm.projectModuleName = module.name
  orientationForm.courseLevel = module.courseLevel || 1
  orientationForm.learningResultId = lr.id
  orientationForm.learningResultNumber = lr.number
  orientationForm.relatedModuleCode = orientation?.module?.code || ''
  orientationForm.supportActivitiesGuidance = orientation?.supportActivitiesGuidance || ''
  orientationForm.editingModuleCode = orientation?.module?.code || ''
  showOrientationModal.value = true
}

const closeOrientationModal = () => {
  showOrientationModal.value = false
  orientationForm.projectModuleCode = ''
  orientationForm.projectModuleName = ''
  orientationForm.courseLevel = null
  orientationForm.learningResultId = null
  orientationForm.learningResultNumber = null
  orientationForm.relatedModuleCode = ''
  orientationForm.supportActivitiesGuidance = ''
  orientationForm.editingModuleCode = ''
}

const toggleHelp = () => {
  showHelp.value = !showHelp.value
}

const closeHelp = () => {
  showHelp.value = false
}

const toggleHelpOrientations = () => {
  showHelpOrientations.value = !showHelpOrientations.value
}

const closeHelpOrientations = () => {
  showHelpOrientations.value = false
}

const saveOrientation = async () => {
  if (!orientationForm.relatedModuleCode || !orientationForm.supportActivitiesGuidance.trim()) {
    return
  }

  isLoading.value = true
  try {
    const moduleCode = orientationForm.editingModuleCode || orientationForm.relatedModuleCode
    const result = await savePCCIntermodularOrientation(props.pccId, {
      moduleCode,
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

const deleteOrientation = async (moduleCode, learningResultId, moduleLabel, raNumber) => {
  const label = moduleLabel ? ` (${moduleLabel})` : ''
  const ra = raNumber ? ` RA${raNumber}` : ''
  if (!confirm(`Segur que vols eliminar aquesta orientació${ra}${label}?`)) return

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
        <span @click="toggleHelp" class="cursor-pointer ms-2 help-icon" role="button" tabindex="0">
          <i class="bi bi-info-circle-fill text-info"></i>
        </span>
      </div>
      <div class="card-body">
        <div v-if="hasProjectCourse1 || hasProjectCourse2">
          <div v-if="weightTotal < 100" class="alert alert-warning">
            <i class="bi bi-exclamation-triangle me-2"></i>
            El pes total dels cursos no arriba al 100%.
          </div>
        </div>
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
                  <div class="form-text">
                    Indica si, mentre l'alumnat fa la FE, ha de vindre al centre a fer el mòdul de
                    projecte en l'horari setmanal, o si aquestes hores s'acumularan en una setmana
                    abans d'anar-se'n, o bé al final de la FE.
                  </div>
                  <select
                    v-model="tempForm.firstCourse.temporalizationOption"
                    :class="[
                      'form-select',
                      { 'is-invalid': hasFieldError('firstCourse.temporalizationOption') }
                    ]"
                  >
                    <option value="">-- Selecciona --</option>
                    <option v-for="opt in tempOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <div
                    v-if="hasFieldError('firstCourse.temporalizationOption')"
                    class="invalid-feedback d-block"
                  >
                    <div
                      v-for="(message, index) in getFieldErrors(
                        'firstCourse.temporalizationOption'
                      )"
                      :key="index"
                    >
                      {{ message }}
                    </div>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold">Observacions sobre la temporalització</label>
                  <textarea
                    v-model="tempForm.firstCourse.temporalizationDetails"
                    :class="[
                      'form-control',
                      { 'is-invalid': hasFieldError('firstCourse.temporalizationDetails') }
                    ]"
                    rows="3"
                    placeholder="Detalls addicionals sobre la temporalització..."
                  ></textarea>
                  <div
                    v-if="hasFieldError('firstCourse.temporalizationDetails')"
                    class="invalid-feedback d-block"
                  >
                    <div
                      v-for="(message, index) in getFieldErrors(
                        'firstCourse.temporalizationDetails'
                      )"
                      :key="index"
                    >
                      {{ message }}
                    </div>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold">Pes (%)</label>
                  <div class="form-text">
                    Indica el pes d'aquest curs per a calcular la nota final.
                  </div>
                  <input
                    type="number"
                    v-model.number="tempForm.firstCourse.weight"
                    :class="['form-control', { 'is-invalid': hasFieldError('firstCourse.weight') }]"
                    min="0"
                    max="100"
                    placeholder="Percentatge del projecte"
                  />
                  <div v-if="hasFieldError('firstCourse.weight')" class="invalid-feedback d-block">
                    <div
                      v-for="(message, index) in getFieldErrors('firstCourse.weight')"
                      :key="index"
                    >
                      {{ message }}
                    </div>
                  </div>
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
                  <div class="form-text">
                    Indica si, mentre l'alumnat fa la FE, ha de vindre al centre a fer el mòdul de
                    projecte en l'horari setmanal, o si aquestes hores s'acumularan en una setmana
                    abans d'anar-se'n, o bé al final de la FE.
                  </div>
                  <select
                    v-model="tempForm.secondCourse.temporalizationOption"
                    :class="[
                      'form-select',
                      { 'is-invalid': hasFieldError('secondCourse.temporalizationOption') }
                    ]"
                  >
                    <option value="">-- Selecciona --</option>
                    <option v-for="opt in tempOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <div
                    v-if="hasFieldError('secondCourse.temporalizationOption')"
                    class="invalid-feedback d-block"
                  >
                    <div
                      v-for="(message, index) in getFieldErrors(
                        'secondCourse.temporalizationOption'
                      )"
                      :key="index"
                    >
                      {{ message }}
                    </div>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold">Observacions sobre la temporalització</label>
                  <textarea
                    v-model="tempForm.secondCourse.temporalizationDetails"
                    :class="[
                      'form-control',
                      { 'is-invalid': hasFieldError('secondCourse.temporalizationDetails') }
                    ]"
                    rows="3"
                    placeholder="Detalls addicionals sobre la temporalització..."
                  ></textarea>
                  <div
                    v-if="hasFieldError('secondCourse.temporalizationDetails')"
                    class="invalid-feedback d-block"
                  >
                    <div
                      v-for="(message, index) in getFieldErrors(
                        'secondCourse.temporalizationDetails'
                      )"
                      :key="index"
                    >
                      {{ message }}
                    </div>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold">Pes (%)</label>
                  <div class="form-text">
                    Indica el pes d'aquest curs per a calcular la nota final.
                  </div>
                  <input
                    type="number"
                    v-model.number="tempForm.secondCourse.weight"
                    :class="[
                      'form-control',
                      { 'is-invalid': hasFieldError('secondCourse.weight') }
                    ]"
                    min="0"
                    max="100"
                    placeholder="Percentatge del projecte"
                  />
                  <div v-if="hasFieldError('secondCourse.weight')" class="invalid-feedback d-block">
                    <div
                      v-for="(message, index) in getFieldErrors('secondCourse.weight')"
                      :key="index"
                    >
                      {{ message }}
                    </div>
                  </div>
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
        8.2 Orientacions per mòdul per a assolir els RA del Projecte Intermodular
        <span
          @click="toggleHelpOrientations"
          class="cursor-pointer ms-2 help-icon"
          role="button"
          tabindex="0"
        >
          <i class="bi bi-info-circle-fill text-info"></i>
        </span>
      </div>
      <div class="card-body">
        <template v-for="course in [1, 2]" :key="course">
          <div v-if="projectModulesByCourse[course].length > 0" class="mb-4">
            <h5 class="fw-bold text-secondary">
              <i class="bi bi-journal-text me-2"></i>
              {{ course === 1 ? '1r Curs' : '2n Curs' }}
            </h5>

            <div class="accordion" :id="`accordion-course-${course}`">
              <div
                v-for="module in projectModulesByCourse[course]"
                :key="module.code"
                class="accordion-item"
              >
                <h2 class="accordion-header">
                  <button
                    class="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    :data-bs-target="`#collapse-${module.code}`"
                  >
                    <strong>{{ module.code }}</strong>
                    <span class="ms-2">{{ module.name }}</span>
                    <span
                      v-if="getOrientationsForProjectModule(module).length > 0"
                      class="badge bg-success ms-2"
                    >
                      {{ getOrientationsForProjectModule(module).length }} orientació/ns
                    </span>
                  </button>
                </h2>
                <div :id="`collapse-${module.code}`" class="accordion-collapse collapse">
                  <div class="accordion-body p-2">
                    <table class="table table-sm table-bordered align-middle mb-0">
                      <thead class="table-light">
                        <tr>
                          <th style="width: 80px">RA</th>
                          <th>Descriptor</th>
                          <th>Mòdul relacionat i orientació</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="lr in module.learningResults" :key="lr.id">
                          <td class="fw-bold text-center">RA{{ lr.number }}</td>
                          <td class="small">{{ lr.descriptor }}</td>
                          <td>
                            <div v-if="getOrientationsForLR(lr.id).length > 0">
                              <div
                                v-for="orientation in getOrientationsForLR(lr.id)"
                                :key="`${orientation.module?.code}-${orientation.learningResult?.id}`"
                                class="orientation-actions d-flex align-items-start justify-content-between gap-2 small"
                              >
                                <div class="orientation-label">
                                  <div class="fw-semibold">
                                    {{ getModuleLabel(orientation.module) }}
                                  </div>
                                  <div class="text-muted">
                                    {{ orientation.supportActivitiesGuidance }}
                                  </div>
                                </div>
                                <span class="orientation-btns">
                                  <button
                                    @click="openOrientationModal(module, lr, orientation)"
                                    class="btn btn-sm btn-primary"
                                    :disabled="isLoading"
                                    title="Modificar"
                                  >
                                    <i class="bi bi-pencil"></i>
                                  </button>
                                  <button
                                    @click="
                                      deleteOrientation(
                                        orientation.module.code,
                                        lr.id,
                                        getModuleLabel(orientation.module),
                                        lr.number
                                      )
                                    "
                                    class="btn btn-sm btn-danger"
                                    :disabled="isLoading"
                                    title="Eliminar"
                                  >
                                    <i class="bi bi-trash"></i>
                                  </button>
                                </span>
                              </div>
                            </div>
                            <span v-else class="text-muted small fst-italic">Sense orientació</span>
                          </td>
                          <td class="text-center">
                            <button
                              @click="openOrientationModal(module, lr)"
                              class="btn btn-sm btn-primary orientation-action-btn"
                              :disabled="isLoading"
                              title="Afegir"
                            >
                              <i class="bi bi-plus-circle"></i>
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

    <Teleport to="body">
      <div v-if="showHelp">
        <div class="modal d-block modal-lg" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-info text-white">
                <h5 class="modal-title mx-auto">
                  <i class="bi bi-info-circle-fill me-2"></i>
                  {{ helpContent.title }}
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
                  <i class="bi bi-x-circle me-2"></i>
                  Tancar
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show" @click="closeHelp"></div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showHelpOrientations">
        <div class="modal d-block modal-lg" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-info text-white">
                <h5 class="modal-title mx-auto">
                  <i class="bi bi-info-circle-fill me-2"></i>
                  {{ helpOrientationsContent.title }}
                </h5>
              </div>
              <div class="modal-body">
                <p v-if="helpOrientationsParagraphs.length === 0" class="text-muted">
                  No hi ha contingut d'ajuda disponible.
                </p>
                <div
                  v-for="(paragraph, index) in helpOrientationsParagraphs"
                  :key="index"
                  class="text-muted mb-3"
                  v-html="paragraph"
                />
              </div>
              <div class="modal-footer mx-auto">
                <button
                  type="button"
                  class="btn btn-info btn-lg help-close-btn"
                  @click="closeHelpOrientations"
                >
                  <i class="bi bi-x-circle me-2"></i>
                  Tancar
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show" @click="closeHelpOrientations"></div>
      </div>
    </Teleport>

    <!-- Modal orientació -->
    <Teleport to="body">
      <div v-if="showOrientationModal">
        <div class="modal d-block" tabindex="-1">
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-primary text-white">
                <h5 class="modal-title">
                  <i class="bi bi-pencil-square me-2"></i>
                  Orientació per a {{ orientationForm.projectModuleCode }} - RA{{
                    orientationForm.learningResultNumber
                  }}
                </h5>
                <button
                  type="button"
                  class="btn-close btn-close-white"
                  @click="closeOrientationModal"
                ></button>
              </div>
              <div class="modal-body">
                <p class="text-muted">
                  Mòdul de projecte:
                  <strong
                    >{{ orientationForm.projectModuleCode }} -
                    {{ orientationForm.projectModuleName }}</strong
                  >
                </p>
                <div class="mb-3">
                  <label class="form-label fw-bold">Mòdul relacionat (mateix curs)</label>
                  <select
                    v-model="orientationForm.relatedModuleCode"
                    class="form-select"
                    :disabled="isLoading || !!orientationForm.editingModuleCode"
                  >
                    <option value="">Selecciona un mòdul</option>
                    <option
                      v-for="module in nonProjectModulesByCourse[orientationForm.courseLevel]"
                      :key="module.code"
                      :value="module.code"
                      :disabled="
                        getUsedModuleCodesForLR(orientationForm.learningResultId).includes(
                          module.code
                        )
                      "
                    >
                      {{ module.code }} - {{ module.name }}
                    </option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-bold">
                    Activitats de suport i orientació per a RA{{
                      orientationForm.learningResultNumber
                    }}
                  </label>
                  <textarea
                    v-model="orientationForm.supportActivitiesGuidance"
                    class="form-control"
                    rows="5"
                    placeholder="Descriu les activitats de suport i orientació proposades..."
                  ></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="closeOrientationModal"
                  :disabled="isLoading"
                >
                  Cancel·lar
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  @click="saveOrientation"
                  :disabled="
                    isLoading ||
                    !orientationForm.relatedModuleCode ||
                    !orientationForm.supportActivitiesGuidance.trim()
                  "
                >
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

.help-close-btn {
  font-size: 1rem;
}

:deep(.help-list) {
  margin: 0.5rem 0 0 0;
}

.orientation-actions .btn,
.orientation-action-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  line-height: 1;
}

.orientation-label {
  flex: 1 1 auto;
  min-width: 0;
}

.orientation-btns {
  display: inline-flex;
  gap: 0.25rem;
  flex: 0 0 auto;
  margin-left: auto;
}
</style>
