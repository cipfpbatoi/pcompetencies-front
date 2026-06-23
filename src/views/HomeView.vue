<script setup>
import { computed, watch, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useDataStore } from '../stores/data'
import { api } from '../repositories/api.js'
import * as yup from 'yup'

// Composables
import { useSyllabusManagement } from '../composables/useSyllabusManagement'
import { useDateValidation } from '../composables/useDateValidation'
import { usePCCManagement } from '../composables/usePCCManagement'
import { useFormValidation } from '../composables/useFormValidation'

// Componentes
import ModalComponent from '../components/ModalComp.vue'
import ActionButton from '../components/ActionButton.vue'
import ShowPdfButton from '../components/ShowPdfButton.vue'
import BtnGetExcel from '../components/BtnGetExcel.vue'
import HistorySyllabusList from '../components/HistorySyllabusList.vue'
import HistoryPccList from '../components/HistoryPccList.vue'
import { statusClass } from '../utils/utils.js'

// ==========================================
// 🏪 STORE & ROUTER
// ==========================================
const store = useDataStore()
const route = useRoute()
const router = useRouter()
const { cycle, module, user } = storeToRefs(store)
const { addMessage, fetchData, fetchCycle } = store

// ==========================================
// 📊 ESTADO LOCAL
// ==========================================
const cycles = ref([])
const currentData = ref({})
const cycleSelect = ref('')
const moduleSelect = ref('')
const moduleAutoSelectWarning = ref('')
const errors = ref({})

// ==========================================
// 🎯 COMPOSABLES
// ==========================================
const {
  syllabusesToCopy,
  isLoading,
  getSyllabusByTurn,
  loadSyllabuses,
  createSyllabus,
  copySyllabusUrl
} = useSyllabusManagement()

const { pcc, isLoadingPCC, hasLoadedPCC, startPCCLoading, loadPCC, hasPCC, createPCC, copyPccUrl } =
  usePCCManagement()

const { canEdit } = useDateValidation(currentData)

const PCC_STATUS_LABELS = {
  pending: 'pendent',
  pendent: 'pendent',
  sent: 'enviat',
  enviat: 'enviat',
  approved: 'aprovat',
  aprovat: 'aprovat',
  rejected: 'rebutjat',
  rebutjat: 'rebutjat',
  verified: 'verificat',
  verificat: 'verificat'
}

const pccStatusLabel = computed(() => {
  return PCC_STATUS_LABELS[pcc.value?.status] || pcc.value?.status || ''
})

const canEditPcc = computed(() => {
  const status = pcc.value?.status
  return ['pending', 'pendent', 'rejected', 'rebutjat', 'rebutjada'].includes(status)
})

const isPccRejected = computed(() => {
  return ['rejected', 'rebutjat', 'rebutjada'].includes(pcc.value?.status)
})

const isPccApproved = computed(() => {
  return ['approved', 'aprovat'].includes(pcc.value?.status)
})

const pccRejectionReason = computed(() => {
  return (
    pcc.value?.rejectedMessage?.reason ||
    pcc.value?.rejectedMessage?.message ||
    pcc.value?.rejectionReason ||
    pcc.value?.rejectReason ||
    pcc.value?.reason ||
    ''
  )
})

const canSeePccPanel = computed(() => {
  return !!user.value?.token
})

const handleModalClose = (modalKey) => {
  if (modalKey === 'improvement') clearImprovementErrors()
  if (modalKey === 'copySyllabus') clearCopySyllabusErrors()
}

const handleImprovementEditClick = () => {
  modalImprovementData.value.isEditing = true
  modalImprovementData.value.showSaveButton = true
  modalImprovementData.value.saveButtonText = 'Editar proposta'
}

const getNextCourseYear = (courseYear) => {
  const match = String(courseYear || '').match(/(\d{4})(\D+)(\d{4})/)
  if (!match) return ''

  return `${Number(match[1]) + 1}${match[2]}${Number(match[3]) + 1}`
}

const getImprovementTargetCourseYear = (syllabus) => {
  if (syllabus?.status === 'pendent') return syllabus.courseYear || ''
  if (syllabus?.status === 'aprovada') return getNextCourseYear(syllabus.courseYear)
  return syllabus?.courseYear || ''
}

const getProposalCourseYear = (proposal) => {
  return proposal?.schoolYear?.course || proposal?.courseYear || ''
}

const getImprovementProposalForSyllabus = (syllabus) => {
  const proposal = syllabus?.currentImprovementProposal
  if (!proposal) return null

  const targetCourseYear = getImprovementTargetCourseYear(syllabus)
  const proposalCourseYear = getProposalCourseYear(proposal)

  if (!proposalCourseYear || !targetCourseYear || proposalCourseYear === targetCourseYear) {
    return proposal
  }

  return null
}

const hasImprovementProposals = (syllabus) => {
  return !!getImprovementProposalForSyllabus(syllabus)?.proposals?.trim()
}

const getImprovementButtonTitle = (turn) => {
  const syllabus = getSyllabusByTurn(turn)
  return hasImprovementProposals(syllabus)
    ? 'Editar propostes de millora'
    : 'Crear propostes de millora'
}

const getCurrentImprovementProposal = () => {
  return getImprovementProposalForSyllabus(actualSyllabus.value)
}

const getImprovementStatusLabel = (status) => {
  if (status === 1) return "Encara no s'ha donat resposta"
  if (status === 2) return "S'aplicaran les propostes de millora o part d'elles"
  if (status === 3) return "NO s'aplicaran les propostes de millora"
  return status || 'No disponible'
}

const getImprovementProposalCourseYear = (proposal) => {
  return proposal?.schoolYear?.course || proposal?.courseYear || 'No disponible'
}

const getEffectiveLabel = (effective) => {
  if (effective === true) return 'Vigent'
  if (effective === false) return 'No vigent'
  return 'No disponible'
}

const hasLaterSchoolYear = (syllabus) => {
  const targetCourseYear = getImprovementTargetCourseYear(syllabus)
  if (!targetCourseYear) return true

  return schoolYears.value.some((schoolYear) => schoolYear.course === targetCourseYear)
}

const getErrorMessage = (error) => {
  if (typeof error?.response?.data === 'string') return error.response.data

  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    error?.message ||
    ''
  )
}

const checkNextSchoolYearWarning = async (syllabus) => {
  if (syllabus?.status !== 'aprovada') return

  try {
    modalImprovementData.value.loadingSchoolYears = true

    if (!schoolYears.value.length) {
      const response = await api.getSchoolYears()
      schoolYears.value = response.data
      schoolYearsLoaded.value = true
    }

    if (!hasLaterSchoolYear(syllabus)) {
      modalImprovementData.value.schoolYearWarning =
        "Encara no s'ha creat el curs posterior per a afegir propostes de millora"
      modalImprovementData.value.showSaveButton = false
    }
  } catch (error) {
    addMessage('error', error)
  } finally {
    modalImprovementData.value.loadingSchoolYears = false
  }
}

// ==========================================
// MODAL: PROPOSTES DE MILLORA
// ================================
const actualSyllabus = ref({})
const schoolYears = ref([])
const schoolYearsLoaded = ref(false)
const improvementModalRef = ref(null)
const modalImprovementData = ref({
  modalId: 'improvementModal',
  title: 'Propostes de millora',
  isEditing: false,
  proposals: '',
  saving: false,
  showSaveButton: false,
  saveButtonText: 'Crear proposta',
  loadingSchoolYears: false,
  schoolYearWarning: '',
  serverError: ''
})
const improvementValidation = useFormValidation(
  yup.object({
    proposals: yup
      .string()
      .typeError('Les propostes han de ser text')
      .trim()
      .required('Les propostes són obligatòries')
      .min(5, 'Les propostes han de tenir almenys 5 caràcters')
  })
)
// Si quieres, desestructura para que sea más cómodo:
const {
  errors: improvementErrors,
  validate: validateImprovement,
  handleServerError: handleImprovementServerError,
  clearErrors: clearImprovementErrors
} = improvementValidation

const setActualSyllabus = (turn) => {
  actualSyllabus.value = getSyllabusByTurn(turn)
  const proposals = getCurrentImprovementProposal()?.proposals || ''

  clearImprovementErrors()
  modalImprovementData.value.proposals = proposals
  modalImprovementData.value.isEditing = !proposals.trim()
  modalImprovementData.value.showSaveButton = !proposals.trim()
  modalImprovementData.value.saveButtonText = proposals.trim()
    ? 'Editar proposta'
    : 'Crear proposta'
  modalImprovementData.value.schoolYearWarning = ''
  modalImprovementData.value.serverError = ''

  checkNextSchoolYearWarning(actualSyllabus.value)
}

const canShowImprovementButton = (turn) => {
  const syllabus = getSyllabusByTurn(turn)

  if (!['pendent', 'aprovada'].includes(syllabus?.status)) return false
  if (syllabus.status !== 'aprovada') return true
  if (!schoolYearsLoaded.value) return true

  return hasLaterSchoolYear(syllabus)
}

const handleSaveImprovementProposals = async () => {
  if (modalImprovementData.value.schoolYearWarning) {
    return
  }

  if (!modalImprovementData.value.isEditing) {
    return
  }
  const isValid = await validateImprovement({ proposals: modalImprovementData.value.proposals })
  if (!isValid) return

  try {
    modalImprovementData.value.saving = true
    modalImprovementData.value.serverError = ''
    const response = await api.createImprovement(actualSyllabus.value.id, {
      proposals: modalImprovementData.value.proposals
    })
    actualSyllabus.value.currentImprovementProposal = response.data
    if (actualSyllabus.value.status == 'pendent') {
      actualSyllabus.value.lastYearImprovementProposal = response.data.proposals
    }
    addMessage('success', 'Propostes de millora guardades')
    modalImprovementData.value.proposals = response.data.proposals || ''
    modalImprovementData.value.showSaveButton = false
    modalImprovementData.value.isEditing = false
    modalImprovementData.value.saveButtonText = 'Editar proposta'
    modalImprovementData.value.schoolYearWarning = ''
    errors.value.proposals = false
    improvementModalRef.value?.hide()
  } catch (error) {
    modalImprovementData.value.serverError = getErrorMessage(error)
    addMessage('error', modalImprovementData.value.serverError || error)
    handleImprovementServerError(error)
  } finally {
    modalImprovementData.value.saving = false
  }
}

// ================================
// MODAL: COPIAR PROGRAMACIÓ
// ================================
const copySyllabusModalRef = ref(null)
const copySyllabusValidation = useFormValidation(
  yup.object({
    proposals: yup.string().trim()
  })
)
// Si quieres, desestructura para que sea más cómodo:
const {
  errors: copySyllabusErrors,
  validate: validateCopySyllabus,
  handleServerError: handleCopySyllabusServerError,
  clearErrors: clearCopySyllabusErrors
} = copySyllabusValidation

const modalCopySyllabusData = ref({
  modalId: 'copySylModal',
  title: 'Tria quina programació vols copiar',
  selectedSyllabusToCopy: '',
  saving: false
})
const copySyllabusTurn = ref('')

const handleCopySyllabusFromOther = async () => {
  if (modalCopySyllabusData.value.selectedSyllabusToCopy === '') {
    copySyllabusErrors.value.selectedSyllabusToCopy = true
    return
  }
  if (!copySyllabusTurn.value) {
    addMessage('error', "No s'ha pogut determinar el torn de destí")
    return
  }
  const isValid = await validateCopySyllabus({ proposals: modalCopySyllabusData.value.proposals })
  if (!isValid) return
  const syllabusToCopyFrom =
    syllabusesToCopy.value[modalCopySyllabusData.value.selectedSyllabusToCopy]
  try {
    modalCopySyllabusData.value.saving = true
    await api.createSyllabusFromOther(syllabusToCopyFrom.id, {
      destinationCycleId: parseInt(cycleSelect.value),
      destinationTurn: copySyllabusTurn.value
    })
    addMessage('success', 'Programació creada')
    copySyllabusModalRef.value?.hide()
    modalCopySyllabusData.value.selectedSyllabusToCopy = ''
    copySyllabusErrors.value.selectedSyllabusToCopy = false
    copySyllabusTurn.value = ''
    await loadSyllabuses(cycleSelect.value, moduleSelect.value)
    return
  } catch (error) {
    addMessage('error', error)
    handleCopySyllabusServerError(error)
  } finally {
    modalCopySyllabusData.value.saving = false
  }
}

const handleCopySyllabusFromLastYear = async (turn) => {
  const syllabus = getSyllabusByTurn(turn)
  try {
    await api.createSyllabusCourseYear(syllabus.id)
    addMessage('success', 'Programació creada')
    await loadSyllabuses(cycleSelect.value, moduleSelect.value)
  } catch (error) {
    addMessage('error', error)
    return
  }
}

// ==========================================
// 🔄 WATCHERS
// ==========================================
watch(
  cycleSelect,
  async (newValue) => {
    if (newValue) {
      startPCCLoading()
      await handleCycleChange()
      await loadPCC(newValue)
    }
  },
  { flush: 'sync' }
)

watch(moduleSelect, async (newValue) => {
  if (newValue && cycleSelect.value) {
    await loadSyllabuses(cycleSelect.value, newValue)
  }
})

// ==========================================
// 🚀 MÉTODOS PRINCIPALES
// ==========================================

// Inicialización
onMounted(async () => {
  await initializeComponent()
})

const initializeComponent = async () => {
  try {
    const [respCycles, respData, respSchoolYears] = await Promise.all([
      api.getCycles(),
      api.getCurrentData(),
      api.getSchoolYears().catch(() => null)
    ])

    cycles.value = respCycles.data
    currentData.value = respData.data
    schoolYears.value = respSchoolYears?.data || []
    schoolYearsLoaded.value = !!respSchoolYears

    // Restaurar estado desde URL
    await restoreStateFromRoute()
  } catch (error) {
    addMessage('error', error)
  }
}

const restoreStateFromRoute = async () => {
  const routeCycleId = route.params.cycleId || route.query.cycleId
  const routeModuleCode = route.params.moduleCode || route.query.moduleCode

  if (routeCycleId || cycle.value.id) {
    cycleSelect.value = routeCycleId || cycle.value.id
    startPCCLoading()
    await handleCycleChange()
    await loadPCC(cycleSelect.value)

    const requestedModuleCode = routeModuleCode || module.value.code

    if (requestedModuleCode) {
      const moduleExists = cycle.value.modules?.some(
        (cycleModule) => String(cycleModule.code) === String(requestedModuleCode)
      )

      if (!moduleExists) {
        moduleSelect.value = ''
        moduleAutoSelectWarning.value =
          "No s'ha pogut seleccionar el mòdul automàticament. Busca'l a través del selector de mòduls."
        return
      }

      moduleSelect.value = requestedModuleCode
      await loadSyllabuses(cycleSelect.value, moduleSelect.value)
    }
  }
}

const handleCycleChange = async () => {
  if (cycleSelect.value) {
    await fetchCycle(cycleSelect.value)
  }
  moduleSelect.value = ''
  moduleAutoSelectWarning.value = ''
}

const handleModuleSelectChange = () => {
  moduleAutoSelectWarning.value = ''
}

// ==========================================
// 🆕 GESTIÓN DEL PCC
// ==========================================
const handleCreatePCC = async () => {
  const success = await createPCC(cycleSelect.value)
  if (success) {
    await loadPCC(cycleSelect.value)
  }
}

const handleEditPCC = () => {
  if (pcc.value.id) {
    router.push(`/pcc/context`)
  }
}

// ==========================================
// 📋 GESTIÓN DE CREACIÓN DE SYLLABUSES
// ==========================================
const handleCreateSyllabus = async (turn) => {
  const success = await createSyllabus(cycleSelect.value, moduleSelect.value, turn)
  if (success) {
    await loadSyllabuses(cycleSelect.value, moduleSelect.value)
  }
}

// ==========================================
// ✏️ EDICIÓN Y NAVEGACIÓN
// ==========================================
const editSyllabus = async (turn) => {
  const syllabus = getSyllabusByTurn(turn)
  await fetchData(moduleSelect.value, syllabus.id)
  router.push('/context')
}

// ==========================================
// 🔍 UTILIDADES
// ==========================================
const isSyllabusOfCurrentYear = (turn) => {
  const syllabus = getSyllabusByTurn(turn)
  return syllabus.courseYear === currentData.value.currentSchoolYear?.course
}

const getTurnLabel = (turn) => {
  return turn === 'presential' ? 'Presencial' : 'Semi-presencial'
}
</script>

<template>
  <main class="border shadow view-main">
    <!-- ================================ -->
    <!-- MODAL: PROPOSTES DE MILLORA -->
    <!-- ================================ -->
    <ModalComponent
      v-bind="modalImprovementData"
      ref="improvementModalRef"
      @save="handleSaveImprovementProposals"
      @close="handleModalClose('improvement')"
    >
      <div class="row">
        <div class="alert alert-info">
          <strong>Curs de la programació:</strong> {{ actualSyllabus.courseYear || 'No disponible' }}
        </div>
        <div v-if="modalImprovementData.loadingSchoolYears" class="alert alert-secondary">
          Comprovant cursos escolars...
        </div>
        <div v-if="modalImprovementData.schoolYearWarning" class="alert alert-warning">
          {{ modalImprovementData.schoolYearWarning }}
        </div>
        <div v-if="modalImprovementData.serverError" class="alert alert-danger">
          {{ modalImprovementData.serverError }}
        </div>
        <div v-show="modalImprovementData.isEditing">
          <p class="text-muted mb-2">
            Estes propostes de millora es tindran en compte per al curs indicat.
          </p>
          <textarea
            v-model="modalImprovementData.proposals"
            class="form-control border-secondary"
            rows="6"
          />
        </div>
        <div v-show="!modalImprovementData.isEditing">
          <div v-if="getCurrentImprovementProposal()" class="card text-start mb-3">
            <div class="card-header bg-info text-white fw-bold">Informació de la proposta</div>
            <div class="card-body">
              <dl class="row mb-0">
                <dt class="col-sm-4">Identificador</dt>
                <dd class="col-sm-8">
                  {{ getCurrentImprovementProposal().id || 'No disponible' }}
                </dd>

                <dt class="col-sm-4">Curs escolar</dt>
                <dd class="col-sm-8">
                  {{ getImprovementProposalCourseYear(getCurrentImprovementProposal()) }}
                </dd>

                <dt class="col-sm-4">Estat del curs</dt>
                <dd class="col-sm-8">
                  {{ getEffectiveLabel(getCurrentImprovementProposal().schoolYear?.effective) }}
                </dd>

                <dt class="col-sm-4">Estat de la proposta</dt>
                <dd class="col-sm-8">
                  {{ getImprovementStatusLabel(getCurrentImprovementProposal().status) }}
                </dd>

                <template v-if="getCurrentImprovementProposal().comments">
                  <dt class="col-sm-4">Resposta</dt>
                  <dd class="col-sm-8">
                    {{ getCurrentImprovementProposal().comments }}
                  </dd>
                </template>

                <dt class="col-12 mt-2">Proposta de millora</dt>
                <dd class="col-12">
                  <pre class="border rounded bg-light p-3 mb-0">{{ getCurrentImprovementProposal().proposals }}</pre>
                </dd>
              </dl>
            </div>
          </div>
          <div v-else class="alert alert-secondary text-start">
            Encara no hi ha cap proposta de millora creada per al curs corresponent.
          </div>
          <button
            v-if="!modalImprovementData.schoolYearWarning"
            class="btn btn-secondary"
            @click="handleImprovementEditClick"
          >
            Editar
          </button>
        </div>
        <p v-if="improvementErrors.proposals" class="text-danger">
          {{ improvementErrors.proposals }}
        </p>
      </div>
    </ModalComponent>

    <!-- ================================ -->
    <!-- MODAL: COPIAR SYLLABUS -->
    <!-- ================================ -->
    <ModalComponent
      @save="handleCopySyllabusFromOther"
      @close="handleModalClose('copySyllabus')"
      v-bind="modalCopySyllabusData"
      ref="copySyllabusModalRef"
    >
      <div class="row p-4">
        <select v-model="modalCopySyllabusData.selectedSyllabusToCopy">
          <option value="">--- Selecciona la programació ---</option>
          <option v-for="(syl, index) in syllabusesToCopy" :key="syl.id" :value="index">
            {{ syl.cycle.shortName }} - {{ syl.turn }}
          </option>
        </select>
        <p v-if="copySyllabusErrors.selectedSyllabusToCopy" class="text-danger">
          Has de triar una programació
        </p>
      </div>
    </ModalComponent>

    <!-- ================================ -->
    <!-- HEADER -->
    <!-- ================================ -->
    <h2 class="text-center fw-bold p-2 text-primary">
      <i class="bi bi-hand-index mx-2"></i>Tria la programació
    </h2>

    <div class="container-fluid px-lg-4">
      <!-- ================================ -->
      <!-- SELECTOR: CICLE -->
      <!-- ================================ -->
      <div class="form-group">
        <label class="form-label fw-bold">Cicle</label>
        <select
          v-model="cycleSelect"
          @change="startPCCLoading"
          class="form-select form-control cycle-module-select"
          aria-label="Selecciona cicle"
        >
          <option value="">-- Selecciona cicle --</option>
          <option v-for="cicle in cycles" :key="cicle.id" :value="cicle.id">
            {{ cicle.completeName }}
          </option>
        </select>
      </div>

      <!-- ✅ SECCIÓN PCC -->
      <div v-if="cycleSelect && canSeePccPanel" class="form-group mt-3">
        <div class="card pcc-summary-card">
          <div
            class="card-body d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3"
          >
            <div>
              <p class="text-uppercase text-muted small fw-bold mb-1">Projecte Curricular de Cicle</p>
              <div v-if="isLoadingPCC" class="d-flex align-items-center gap-2">
                <span class="spinner-border spinner-border-sm text-primary"></span>
                <span class="text-muted">Carregant PCC...</span>
              </div>
              <template v-else-if="hasLoadedPCC">
                <div v-if="hasPCC()" class="d-flex flex-wrap align-items-center gap-2">
                  <span class="fw-bold">PCC actual</span>
                  <span class="badge rounded-pill" :class="statusClass(pcc.status)">
                    {{ pccStatusLabel || pcc.status }}
                  </span>
                  <small class="text-muted">
                    Última modificació:
                    {{ pcc.updatedAt ? new Date(pcc.updatedAt).toLocaleDateString('ca-ES') : 'N/A' }}
                  </small>
                </div>
                <div v-else class="text-muted">Encara no hi ha PCC creat per a este cicle.</div>
              </template>
            </div>

            <div v-if="hasLoadedPCC" class="d-flex flex-wrap justify-content-lg-end gap-2">
              <template v-if="hasPCC()">
                <ActionButton
                  title="Editar PCC"
                  buttonClass="btn-success text-white"
                  iconClass="bi bi-pencil-fill"
                  :disabled="!canEditPcc"
                  @clicked="handleEditPCC"
                />
                <ShowPdfButton
                  type="pcc"
                  :pcc="pcc"
                  :cycle="cycle"
                  :center-code="cycle?.center?.code || cycle?.centerCode"
                  title="Veure PDF"
                  buttonClass="btn btn-danger"
                />
                <button
                  v-if="isPccApproved"
                  type="button"
                  class="btn btn-secondary"
                  title="Copiar enllaç públic del PCC"
                  @click="copyPccUrl(pcc, cycle, user)"
                >
                  <i class="bi bi-copy"></i> Copiar enllaç
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  data-bs-toggle="collapse"
                  data-bs-target="#pcc-history"
                  aria-expanded="false"
                  aria-controls="pcc-history"
                >
                  <i class="bi bi-clock-history"></i> Històric
                </button>
              </template>
              <ActionButton
                v-else
                title="Crear nou PCC"
                buttonClass="btn-success"
                iconClass="bi bi-plus-circle-fill"
                @clicked="handleCreatePCC"
              />
            </div>
          </div>

          <div v-if="isPccRejected && pccRejectionReason" class="alert alert-danger mx-3 mb-3">
            <strong>Rebutjat!</strong> Motiu: {{ pccRejectionReason }}
          </div>

          <div id="pcc-history" class="collapse border-top">
            <div class="card-body pt-3">
              <HistoryPccList v-if="hasPCC()" :pcc-id="pcc.id" :pcc="pcc" :cycle="cycle" />
              <div v-else class="alert alert-secondary mb-0">No hi ha PCC disponible.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================================ -->
      <!-- SELECTOR: MÒDUL -->
      <!-- ================================ -->
      <div v-if="cycleSelect" class="form-group fw-bold mt-3 mb-3">
        <label>Mòdul</label>
        <div v-if="moduleAutoSelectWarning" class="alert alert-warning mt-2 mb-2">
          {{ moduleAutoSelectWarning }}
        </div>
        <select
          v-model="moduleSelect"
          class="form-select form-control cycle-module-select"
          @change="handleModuleSelectChange"
        >
          <option value="">-- Selecciona mòdul --</option>
          <option v-for="mod in cycle.modules" :key="mod.code" :value="mod.code">
            {{ mod.name }}
          </option>
        </select>
      </div>

      <!-- ================================ -->
      <!-- LISTA DE SYLLABUSES -->
      <!-- ================================ -->
      <div v-if="moduleSelect" class="form-group mt-4">
        <!-- Loading spinner -->
        <div v-show="isLoading" class="text-center mt-5">
          <span class="spinner-border text-primary"></span>
        </div>

        <!-- Content -->
        <div v-show="!isLoading" class="row g-3 align-items-start">
          <div
            v-for="turn in cycle.availableTurns"
            :key="turn"
            :class="cycle.availableTurns.length > 1 ? 'col-12 col-xl-6' : 'col-12'"
          >
            <div class="card h-100 syllabus-summary-card">
              <div class="card-header bg-info text-white text-uppercase fw-bold py-2">
                Modalitat {{ getTurnLabel(turn) }}
              </div>

              <div class="card-body text-center p-3">
                <div class="syllabus-card-layout">
                  <!-- Tabs -->
                  <ul class="nav nav-pills nav-fill gap-2 compact-tabs syllabus-side-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                      <button
                        class="nav-link active py-1 px-2"
                        :data-bs-target="`#current-${turn}`"
                        data-bs-toggle="tab"
                        type="button"
                        role="tab"
                      >
                        <i class="bi bi-file-earmark-text"></i>
                        Actual
                      </button>
                    </li>
                    <li class="nav-item" role="presentation">
                      <button
                        class="nav-link py-1 px-2"
                        :data-bs-target="`#history-${turn}`"
                        data-bs-toggle="tab"
                        type="button"
                        role="tab"
                      >
                        <i class="bi bi-clock-history"></i> Històric
                      </button>
                    </li>
                  </ul>

                  <div class="tab-content syllabus-tab-content">
                <!-- TAB: ACTUALS -->
                <div
                  :id="`current-${turn}`"
                  class="tab-pane fade show active text-center"
                  role="tabpanel"
                >
                  <p
                    v-if="getSyllabusByTurn(turn)?.status === 'aprovada'"
                    class="alert alert-info text-center mb-2 py-2 px-3 small"
                  >
                    Esta programació ja està aprovada i, per tant, és pública. Pots copiar l'enllaç
                    per a passar-li-ho als alumnes.
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      title="Copiar enllaç"
                      @click="copySyllabusUrl(getSyllabusByTurn(turn))"
                    >
                      <i class="bi bi-copy"></i>
                    </button>
                  </p>

                  <!-- Período de edición abierto -->
                  <div v-if="canEdit">
                    <div v-if="getSyllabusByTurn(turn).id" class="my-2 compact-actions">
                      <p
                        v-if="getSyllabusByTurn(turn).status === 'rebutjada'"
                        class="alert alert-danger py-2 px-3 mb-2 text-start"
                      >
                        <strong>Rebutjada!</strong> Raó:
                        {{ getSyllabusByTurn(turn).rejectedMessage?.reason }}
                      </p>

                      <ActionButton
                        v-if="isSyllabusOfCurrentYear(turn)"
                        :disabled="
                          !['pendent', 'rebutjada'].includes(getSyllabusByTurn(turn).status)
                        "
                        :status="getSyllabusByTurn(turn).status"
                        title="Editar programació"
                        buttonClass="btn-success text-white compact-action-btn"
                        iconClass="bi bi-pencil-fill"
                        @clicked="editSyllabus(turn)"
                      />

                      <ActionButton
                        v-else
                        title="Crear programació a partir de la del curs anterior"
                        buttonClass="btn-primary compact-action-btn"
                        iconClass="bi bi-plus-circle-fill"
                        @clicked="handleCopySyllabusFromLastYear(turn)"
                      />
                    </div>

                    <div v-if="!getSyllabusByTurn(turn).id" class="compact-actions">
                      <ActionButton
                        title="Crear programació"
                        buttonClass="btn-success compact-action-btn"
                        iconClass="bi bi-plus-circle-fill"
                        @clicked="handleCreateSyllabus(turn)"
                      />

                      <div v-if="syllabusesToCopy.length > 0">
                        <ActionButton
                          title="Crear a partir d'altra programació"
                          buttonClass="btn-primary compact-action-btn"
                          iconClass="bi bi-node-plus-fill"
                          data-bs-toggle="modal"
                          data-bs-target="#copySylModal"
                          @click="copySyllabusTurn = turn"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Botón de propuestas de mejora -->
                  <div class="compact-actions">
                    <ActionButton
                      v-if="canShowImprovementButton(turn)"
                      buttonClass="btn btn-warning text-white compact-action-btn"
                      :title="getImprovementButtonTitle(turn)"
                      icon-class="bi bi-lightbulb-fill"
                      data-bs-toggle="modal"
                      data-bs-target="#improvementModal"
                      @click="setActualSyllabus(turn)"
                    />
                  </div>
                  <!-- Syllabus aprobado -->
                  <div v-if="getSyllabusByTurn(turn)?.status === 'aprovada'">
                    <ShowPdfButton
                      v-if="getSyllabusByTurn(turn).id"
                      type="syllabus"
                      :syllabus="getSyllabusByTurn(turn)"
                      title="Veure PDF"
                      buttonClass="btn btn-danger compact-action-btn"
                      @waiting="isLoading = $event"
                    />
                  </div>

                  <!-- Vista previa PDF -->
                  <div v-else>
                    <ShowPdfButton
                      v-if="getSyllabusByTurn(turn).id"
                      type="syllabus"
                      :syllabus="getSyllabusByTurn(turn)"
                      title="Veure esborrany"
                      buttonClass="btn btn-danger compact-action-btn"
                      @waiting="isLoading = $event"
                    />
                  </div>

                  <!-- Exportar Excel -->
                  <div
                    v-if="
                      getSyllabusByTurn(turn)?.status &&
                      getSyllabusByTurn(turn)?.status !== 'pendent'
                    "
                  >
                    <BtnGetExcel
                      :module-name="getSyllabusByTurn(turn).module.name"
                      :schedules="getSyllabusByTurn(turn).schedules"
                      :syllabus-id="getSyllabusByTurn(turn).id"
                      btnClass="compact-action-btn"
                    />
                  </div>
                </div>

                <!-- TAB: HISTÒRIC -->
                <div :id="`history-${turn}`" class="tab-pane fade text-center" role="tabpanel">
                  <div class="row text-center">
                    <div v-if="getSyllabusByTurn(turn).id" class="mb-3">
                      <HistorySyllabusList
                        :key="getSyllabusByTurn(turn).id"
                        :syllabus-id="getSyllabusByTurn(turn).id"
                        :turn-label="turn"
                      />
                    </div>
                  </div>
                </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
[v-cloak] {
  display: none;
}

.cycle-module-select {
  min-height: 3rem;
  line-height: 1.5;
}

.pcc-summary-card {
  border-left: 0.45rem solid #2c4a7a;
}

.syllabus-summary-card .card-body {
  min-height: 0;
}

.syllabus-card-layout {
  display: grid;
  gap: 0;
}

.syllabus-tab-content {
  min-width: 0;
  padding: 1rem;
  background: #f8fbff;
  border: 1px solid #0dcaf0;
  border-radius: 0 0 0.75rem 0.75rem;
}

.compact-tabs .nav-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  height: 100%;
  border: 1px solid #d6e0ea;
  border-radius: 0.55rem 0.55rem 0 0;
  color: #087990;
  font-size: 0.9rem;
  font-weight: 600;
  background: #eef3f8;
}

.compact-tabs {
  padding: 0;
  margin-bottom: -1px;
}

.compact-tabs .nav-link.active {
  color: #055160;
  background-color: #f8fbff;
  border-color: #0dcaf0 #0dcaf0 #f8fbff;
  box-shadow: none;
}

.compact-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.compact-action-btn {
  width: 100%;
}

@media (min-width: 576px) {
  .compact-action-btn {
    width: 21rem;
  }
}

@media (min-width: 768px) {
  .syllabus-card-layout {
    grid-template-columns: 8.5rem minmax(0, 1fr);
    align-items: start;
  }

  .syllabus-tab-content {
    border-radius: 0 0.75rem 0.75rem 0.75rem;
  }

  .syllabus-side-tabs {
    position: sticky;
    top: 0.75rem;
    flex-direction: column;
    margin-right: -1px;
    margin-bottom: 0;
  }

  .syllabus-side-tabs .nav-item {
    width: 100%;
  }

  .syllabus-side-tabs .nav-link {
    width: 100%;
    min-height: 2.5rem;
    border-radius: 0.55rem 0 0 0.55rem;
    text-align: left;
    justify-content: flex-start;
  }

  .syllabus-side-tabs .nav-link.active {
    border-color: #0dcaf0 #f8fbff #0dcaf0 #0dcaf0;
  }
}
</style>
