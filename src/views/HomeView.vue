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
}

// ==========================================
// MODAL: PROPOSTES DE MILLORA
// ================================
const actualSyllabus = ref({})
const improvementModalRef = ref(null)
const modalImprovementData = ref({
  modalId: 'improvementModal',
  title: 'Propostes de millora',
  isEditing: false,
  proposals: '',
  saving: false,
  showSaveButton: false
})
const improvementValidation = useFormValidation(
  yup.object({
    proposals: yup.string().trim().min(5, 'Les propostes han de tenir almenys 5 caràcters')
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
  modalImprovementData.value.proposals =
    actualSyllabus.value.currentImprovementProposal?.proposals || ''
}

const handleSaveImprovementProposals = async () => {
  if (!modalImprovementData.value.isEditing) {
    return
  }
  const isValid = await validateImprovement({ proposals: modalImprovementData.value.proposals })
  if (!isValid) return
  if (!modalImprovementData.value.proposals) {
    const confirmed = confirm(
      "Estàs segur que vols eliminar les propostes de millora d'aquesta programació?"
    )
    if (!confirmed) return
  }

  try {
    modalImprovementData.value.saving = true
    const response = await api.createImprovement(actualSyllabus.value.id, {
      proposals: modalImprovementData.value.proposals
    })
    actualSyllabus.value.currentImprovementProposal.proposals = response.data.proposals
    if (actualSyllabus.value.status == 'pendent') {
      actualSyllabus.value.lastYearImprovementProposal = response.data.proposals
    }
    addMessage('success', 'Propostes de millora guardades')
    modalImprovementData.value.proposals = ''
    modalImprovementData.value.showSaveButton = false
    modalImprovementData.value.isEditing = false
    errors.value.proposals = false
    improvementModalRef.value?.hide()
  } catch (error) {
    addMessage('error', error)
    handleImprovementServerError(error)
  } finally {
    modalImprovementData.value.isEditing = false
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
    const [respCycles, respData] = await Promise.all([api.getCycles(), api.getCurrentData()])

    cycles.value = respCycles.data
    currentData.value = respData.data

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

    if (routeModuleCode || module.value.code) {
      moduleSelect.value = routeModuleCode || module.value.code
      await loadSyllabuses(cycleSelect.value, moduleSelect.value)
    }
  }
}

const handleCycleChange = async () => {
  if (cycleSelect.value) {
    await fetchCycle(cycleSelect.value)
  }
  moduleSelect.value = ''
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
        <div v-show="modalImprovementData.isEditing">
          <textarea
            v-model="modalImprovementData.proposals"
            class="form-control border-secondary"
            rows="6"
          />
        </div>
        <div v-show="!modalImprovementData.isEditing">
          <pre>{{ modalImprovementData.proposals || 'No hi ha cap proposta' }}</pre>
          <button class="btn btn-secondary" @click="handleImprovementEditClick">Editar</button>
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
      <div v-if="cycleSelect && canSeePccPanel" class="form-group mt-4">
        <div class="card">
          <div class="card-header pcc text-white fw-bold">
            <i class="bi bi-file-earmark-text-fill me-2"></i> Projecte Curricular de Cicle (PCC)
          </div>
          <div class="card-body text-center">
            <!-- Loading spinner -->
            <div v-if="isLoadingPCC" class="text-center py-3">
              <span class="spinner-border text-primary"></span>
              <p class="mt-2 text-muted">Carregant PCC...</p>
            </div>
            <!-- Contenido cuando no está cargando -->
            <div v-else-if="hasLoadedPCC">
              <ul class="nav nav-tabs justify-content-center" role="tablist">
                <li class="nav-item" role="presentation">
                  <button
                    class="nav-link active"
                    data-bs-target="#pcc-current"
                    data-bs-toggle="tab"
                    type="button"
                    role="tab"
                  >
                    <i class="bi bi-file-earmark-text"></i>
                    PCC actual
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button
                    class="nav-link"
                    data-bs-target="#pcc-history"
                    data-bs-toggle="tab"
                    type="button"
                    role="tab"
                  >
                    <i class="bi bi-clock-history"></i> Historic
                  </button>
                </li>
              </ul>

              <div class="tab-content mt-3">
                <div id="pcc-current" class="tab-pane fade show active text-center" role="tabpanel">
                  <div class="d-flex flex-column align-items-center gap-2">
                    <!-- PCC Existe: Mostrar botones de acción -->
                    <template v-if="hasPCC()">
                      <ActionButton
                        title="Editar PCC"
                        buttonClass="btn-success text-white col-12 col-sm-auto"
                        iconClass="bi bi-pencil-fill"
                        :status="pcc.status"
                        :status-label="pccStatusLabel"
                        :disabled="!canEditPcc"
                        @clicked="handleEditPCC"
                      />
                      <ShowPdfButton
                        type="pcc"
                        :pcc="pcc"
                        :cycle="cycle"
                        :center-code="cycle?.center?.code || cycle?.centerCode"
                        title="Veure PDF del PCC"
                        buttonClass="btn btn-danger col-12 col-sm-auto"
                      />
                      <div
                        v-if="isPccApproved"
                        class="alert alert-info col-12 col-lg-10 text-center m-auto mt-2"
                      >
                        Este PCC ja està aprovat i, per tant, és públic. Pots copiar l'enllaç per a
                        passar-li-ho a qui corresponga.
                        <button
                          type="button"
                          class="btn btn-secondary btn-sm"
                          title="Copiar enllaç"
                          @click="copyPccUrl(pcc, cycle, user)"
                        >
                          <i class="bi bi-copy"></i>
                        </button>
                      </div>
                      <!-- <span class="badge bg-success align-self-center fs-6">
                        <i class="bi bi-check-circle-fill me-1"></i>
                        PCC Creat
                      </span> -->
                    </template>
                    <!-- PCC No Existe: Botón de crear -->
                    <template v-else>
                      <ActionButton
                        title="Crear nou PCC"
                        buttonClass="btn-success col-12 col-sm-auto"
                        iconClass="bi bi-plus-circle-fill"
                        @clicked="handleCreatePCC"
                      />
                      <!-- <span class="badge bg-warning text-dark align-self-center fs-6">
                          <i class="bi bi-exclamation-triangle-fill me-1"></i>
                          Sense PCC
                        </span> -->
                    </template>
                  </div>
                  <div v-if="isPccRejected && pccRejectionReason" class="alert alert-danger mt-3">
                    <strong>Rebutjat!</strong> Motiu: {{ pccRejectionReason }}
                  </div>
                  <!-- Información adicional -->
                  <div v-if="hasPCC()" class="mt-3">
                    <small class="text-muted">
                      <i class="bi bi-info-circle me-1"></i> Última modificació:
                      {{
                        pcc.updatedAt ? new Date(pcc.updatedAt).toLocaleDateString('ca-ES') : 'N/A'
                      }}
                    </small>
                  </div>
                </div>

                <div id="pcc-history" class="tab-pane fade text-center" role="tabpanel">
                  <HistoryPccList v-if="hasPCC()" :pcc-id="pcc.id" :pcc="pcc" :cycle="cycle" />
                  <div v-else class="alert alert-secondary mt-3">No hi ha PCC disponible.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================================ -->
      <!-- SELECTOR: MÒDUL -->
      <!-- ================================ -->
      <div v-if="cycleSelect" class="form-group fw-bold mt-3 mb-5">
        <label>Mòdul</label>
        <select v-model="moduleSelect" class="form-select form-control cycle-module-select">
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
        <div v-show="!isLoading">
          <div v-for="turn in cycle.availableTurns" :key="turn" class="card my-2">
            <div class="card-header bg-info text-white text-uppercase fw-bold">
              Modalitat {{ getTurnLabel(turn) }}
            </div>

            <div class="card-body text-center">
              <!-- Tabs -->
              <ul class="nav nav-tabs justify-content-center" role="tablist">
                <li class="nav-item" role="presentation">
                  <button
                    class="nav-link active"
                    :data-bs-target="`#current-${turn}`"
                    data-bs-toggle="tab"
                    type="button"
                    role="tab"
                  >
                    <i class="bi bi-file-earmark-text"></i>
                    Programacions Actuals
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button
                    class="nav-link"
                    :data-bs-target="`#history-${turn}`"
                    data-bs-toggle="tab"
                    type="button"
                    role="tab"
                  >
                    <i class="bi bi-clock-history"></i> Històric
                  </button>
                </li>
              </ul>

              <div class="tab-content mt-3">
                <!-- TAB: ACTUALS -->
                <div
                  :id="`current-${turn}`"
                  class="tab-pane fade show active text-center"
                  role="tabpanel"
                >
                  <!-- Período de edición abierto -->
                  <div v-if="canEdit">
                    <div v-if="getSyllabusByTurn(turn).id" class="my-2">
                      <p
                        v-if="getSyllabusByTurn(turn).status === 'rebutjada'"
                        class="alert alert-danger m-2 col-12 col-md-10 mx-auto text-start"
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
                        buttonClass="btn-success col-12 col-sm-4 text-white"
                        iconClass="bi bi-pencil-fill"
                        @clicked="editSyllabus(turn)"
                      />

                      <ActionButton
                        v-else
                        title="Crear programació a partir de la del curs anterior"
                        buttonClass="btn-primary col-12 col-sm-4"
                        iconClass="bi bi-plus-circle-fill"
                        @clicked="handleCopySyllabusFromLastYear(turn)"
                      />
                    </div>

                    <div v-if="!getSyllabusByTurn(turn).id">
                      <ActionButton
                        title="Crear programació"
                        buttonClass="btn-success col-12 col-sm-4"
                        iconClass="bi bi-plus-circle-fill"
                        @clicked="handleCreateSyllabus(turn)"
                      />

                      <div v-if="syllabusesToCopy.length > 0" class="mt-3">
                        <ActionButton
                          title="Crear a partir d'altra programació"
                          buttonClass="btn-primary mt-2 mt-sm-0 col-12 col-sm-4"
                          iconClass="bi bi-node-plus-fill"
                          data-bs-toggle="modal"
                          data-bs-target="#copySylModal"
                          @click="copySyllabusTurn = turn"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Botón de propuestas de mejora -->
                  <div>
                    <ActionButton
                      v-if="['pendent', 'aprovada'].includes(getSyllabusByTurn(turn)?.status)"
                      buttonClass="btn btn-warning col-12 col-sm-4 mb-2 text-white"
                      title="Veure/Modificar propostes de millora"
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
                      buttonClass="btn btn-danger col-12 col-sm-4"
                      @waiting="isLoading = $event"
                    />

                    <p class="alert alert-info col-12 col-lg-10 text-center m-auto mt-2">
                      Esta programació ja està aprovada i, per tant, és pública. Pots copiar
                      l'enllaç per a passar-li-ho als alumnes.
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        title="Copiar enllaç"
                        @click="copySyllabusUrl(getSyllabusByTurn(turn))"
                      >
                        <i class="bi bi-copy"></i>
                      </button>
                    </p>
                  </div>

                  <!-- Vista previa PDF -->
                  <div v-else>
                    <ShowPdfButton
                      v-if="getSyllabusByTurn(turn).id"
                      type="syllabus"
                      :syllabus="getSyllabusByTurn(turn)"
                      title="Veure esborrany"
                      buttonClass="btn btn-danger col-12 col-sm-4"
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
                      btnClass="col-sm-4 col-12"
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
</style>
