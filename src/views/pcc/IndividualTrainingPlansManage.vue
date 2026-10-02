<script>
import { mapState, mapActions } from 'pinia'
import { Modal } from 'bootstrap'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api'
import { statusClass } from '@/utils/utils.js'

const TURN_LABELS = {
  presential: 'Presencial',
  'half-presential': 'Semi-presencial'
}

export default {
  computed: {
    ...mapState(useDataStore, ['user']),
    isAdmin() {
      return this.user.info?.roles?.includes('ROLE_ADMIN')
    },
    isCoordinadorFct() {
      return this.user.info?.roles?.includes('ROLE_COORDINADOR_FCT')
    },
    canView() {
      return this.isAdmin || this.isCoordinadorFct
    },
    ownDepartmentId() {
      return this.user.info?.department?.id || null
    },
    pageTitle() {
      if (this.isAdmin) return 'Plans Formatius Individuals (tot el centre)'
      if (this.isCoordinadorFct) {
        const name = this.user.info?.department?.shortName || this.user.info?.department?.name
        return name ? `Plans Formatius Individuals (${name})` : 'Plans Formatius Individuals'
      }
      return 'Plans Formatius Individuals'
    },
    // Quan hi ha un departament triat, el llistat de plans ja ve filtrat pel backend
    // per eixe departament: els cicles del select ixen dels cicles vistos fins ara
    // (this.cycleOptionsMap), acumulats pàgina a pàgina ja que el llistat de plans
    // ara ve paginat i no porta mai tots els plans d'un colp
    cycleFilterOptions() {
      if (!this.isAdmin || !this.filters.departmentId) return this.cycles
      return Object.values(this.cycleOptionsMap)
    },
    totalPages() {
      return this.totalItems > 0 ? Math.ceil(this.totalItems / this.itemsPerPage) : 1
    }
  },
  data() {
    return {
      cycles: [],
      schoolYears: [],
      currentSchoolYear: '',
      plans: [],
      departmentOptions: [],
      departmentOptionsMap: {},
      cycleOptionsMap: {},
      loadingPlans: false,
      filters: {
        schoolYearId: '',
        cycleId: '',
        moduleCode: '',
        departmentId: '',
        status: ''
      },
      statusOptions: ['pendent', 'enviada', 'aprovada', 'rebutjada'],
      currentPage: 1,
      itemsPerPage: 25,
      totalItems: 0,
      changingStatusPlanId: null,
      downloadingPlanId: null,
      rejectPlanModal: null,
      rejectPlanTarget: null,
      rejectPlanReason: '',
      rejectPlanError: '',
      isRejectingPlan: false,
      actionErrorModal: null,
      actionErrorTitle: '',
      actionErrorMessage: '',
      pageInitialized: false
    }
  },
  // El watch amb immediate:true cobreix tant el cas en que user.info ja estiga
  // carregat en muntar-se el component com el cas en que encara s'estiga
  // carregant (App.vue fa loadData() de forma asíncrona, i pot no haver acabat
  // quan esta pàgina es munta en un refresc directe)
  watch: {
    canView: {
      immediate: true,
      handler(value) {
        if (value) this.initPage()
      }
    }
  },
  mounted() {
    this.rejectPlanModal = new Modal(document.getElementById('rejectIndividualTrainingPlanModal'))
    this.actionErrorModal = new Modal(document.getElementById('planActionErrorModal'))
  },
  methods: {
    async initPage() {
      if (this.pageInitialized) return
      this.pageInitialized = true
      try {
        const [cyclesResponse, schoolYearsResponse, currentDataResponse] = await Promise.all([
          api.getCycles(),
          api.getSchoolYears(),
          api.getCurrentData()
        ])
        this.cycles = cyclesResponse.data
        this.schoolYears = schoolYearsResponse.data
        this.currentSchoolYear = currentDataResponse.data?.currentSchoolYear?.course || ''
      } catch (error) {
        this.addMessage('error', error)
      }
      await this.loadPlans()
    },
    // Els canvis d'estat (enviar/aprovar/rebutjar/posar pendent) només es permeten
    // sobre plans del curs escolar actual, mai sobre plans d'anys anteriors
    isPlanOfCurrentSchoolYear(plan) {
      return !this.currentSchoolYear || plan.courseYear === this.currentSchoolYear
    },
    ...mapActions(useDataStore, [
      'addMessage',
      'refreshPccByCycleId',
      'approveIndividualTrainingPlan',
      'rejectIndividualTrainingPlan',
      'setPendingIndividualTrainingPlan'
    ]),
    statusClass(status) {
      return statusClass(status)
    },
    getErrorMessage(error) {
      if (typeof error?.response?.data === 'string') return error.response.data
      return (
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        error?.message ||
        'Error desconegut'
      )
    },
    showActionError(title, error) {
      this.actionErrorTitle = title
      this.actionErrorMessage = this.getErrorMessage(error)
      this.actionErrorModal.show()
    },
    getTurnLabel(turn) {
      return TURN_LABELS[turn] || turn
    },
    getModulesLabel(plan) {
      return (plan.modules || []).map((module) => `${module.name} (${module.code})`).join(', ')
    },
    sanitizeFileNamePart(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    },
    async handleDownloadPlanPdf(plan) {
      this.downloadingPlanId = plan.id
      try {
        const response = await api.getIndividualTrainingPlanPdf(plan.curricularProject.id, plan.id)
        const blob = new Blob([response.data], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.setAttribute(
          'download',
          `AnnexI-PlaFormatiuIndividual-${this.sanitizeFileNamePart(plan.name)}.pdf`
        )
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setTimeout(() => URL.revokeObjectURL(url), 100)
      } catch (error) {
        this.addMessage('error', error)
      } finally {
        this.downloadingPlanId = null
      }
    },
    getListParams(includeDepartment) {
      const params = {
        schoolYearId: this.filters.schoolYearId || undefined,
        cycleId: this.filters.cycleId || undefined,
        moduleCode: this.filters.moduleCode || undefined,
        status: this.filters.status || undefined,
        page: this.currentPage,
        itemsPerPage: this.itemsPerPage
      }
      if (includeDepartment && this.filters.departmentId) {
        params.departmentId = this.filters.departmentId
      }
      return params
    },
    // El llistat ara ve paginat: no podem derivar la llista completa de departaments/cicles
    // d'un sol llistat, així que anem acumulant els que veiem a cada pàgina carregada
    captureDepartmentOptions() {
      if (!this.isAdmin) return
      this.plans.forEach((plan) => {
        const department = plan.curricularProject?.cycle?.department
        if (department?.id && !this.departmentOptionsMap[department.id]) {
          this.departmentOptionsMap[department.id] = {
            id: department.id,
            name: department.name || department.shortName
          }
        }
      })
      this.departmentOptions = Object.values(this.departmentOptionsMap)
    },
    captureCycleOptions() {
      if (!this.isAdmin || !this.filters.departmentId) return
      this.plans.forEach((plan) => {
        const cycle = plan.curricularProject?.cycle
        if (cycle?.id && !this.cycleOptionsMap[cycle.id]) {
          this.cycleOptionsMap[cycle.id] = cycle
        }
      })
    },
    applyPlansResponse(data) {
      this.plans = data['hydra:member'] || data
      this.totalItems =
        typeof data['hydra:totalItems'] === 'number' ? data['hydra:totalItems'] : this.plans.length
      this.captureDepartmentOptions()
      this.captureCycleOptions()
    },
    async loadPlans() {
      if (!this.canView) return
      try {
        this.loadingPlans = true
        if (this.isAdmin) {
          const response = await api.getIndividualTrainingPlansCenter(this.getListParams(true))
          this.applyPlansResponse(response.data)
        } else if (this.isCoordinadorFct && this.ownDepartmentId) {
          const response = await api.getIndividualTrainingPlansByDepartment(
            this.ownDepartmentId,
            this.getListParams(false)
          )
          this.applyPlansResponse(response.data)
        }
      } catch (error) {
        this.addMessage('error', error)
      } finally {
        this.loadingPlans = false
      }
    },
    resetPageAndLoad() {
      this.currentPage = 1
      this.loadPlans()
    },
    goToPage(page) {
      if (page < 1 || page > this.totalPages || page === this.currentPage || this.loadingPlans) {
        return
      }
      this.currentPage = page
      this.loadPlans()
    },
    onSchoolYearChange() {
      this.resetPageAndLoad()
    },
    handleDepartmentFilterChange() {
      this.filters.cycleId = ''
      this.cycleOptionsMap = {}
      this.resetPageAndLoad()
    },
    clearFilters() {
      this.filters = { schoolYearId: '', cycleId: '', moduleCode: '', departmentId: '', status: '' }
      this.cycleOptionsMap = {}
      this.resetPageAndLoad()
    },
    async viewPlanCycle(plan) {
      const cycleId = plan.curricularProject?.cycle?.id
      if (!cycleId) {
        this.addMessage('error', "No s'ha pogut determinar el cicle d'este pla")
        return
      }
      localStorage.pccCycleId = cycleId
      const refreshed = await this.refreshPccByCycleId(cycleId)
      if (!refreshed) return
      this.$router.push({
        name: 'individualTrainingPlansPCC',
        query: plan.status === 'pendent' ? { openPlanId: plan.id } : {}
      })
    },
    mergePlanStatus(planId, patch) {
      const index = this.plans.findIndex((item) => item.id === planId)
      if (index > -1) {
        this.plans.splice(index, 1, { ...this.plans[index], ...patch })
      }
    },
    async handleApprovePlan(plan) {
      if (!confirm(`Vas a aprovar el pla formatiu individual "${plan.name}".`)) return

      this.changingStatusPlanId = plan.id
      try {
        const result = await this.approveIndividualTrainingPlan(plan.curricularProject.id, plan.id)
        if (result) {
          this.mergePlanStatus(plan.id, { status: result.status, rejectedMessage: null })
        }
      } finally {
        this.changingStatusPlanId = null
      }
    },
    async handleSetPendingPlan(plan) {
      if (!confirm(`Vas a posar el pla formatiu individual "${plan.name}" com a pendent.`)) return

      this.changingStatusPlanId = plan.id
      try {
        const result = await this.setPendingIndividualTrainingPlan(
          plan.curricularProject.id,
          plan.id
        )
        if (result) {
          this.mergePlanStatus(plan.id, { status: result.status })
        }
      } finally {
        this.changingStatusPlanId = null
      }
    },
    openRejectPlanModal(plan) {
      this.rejectPlanTarget = plan
      this.rejectPlanReason = ''
      this.rejectPlanError = ''
      this.rejectPlanModal.show()
    },
    async submitRejectPlan() {
      if (this.rejectPlanReason.trim().length < 8) {
        this.rejectPlanError = 'El motiu és obligatori i ha de tindre almenys 8 caràcters'
        return
      }
      this.rejectPlanError = ''

      this.isRejectingPlan = true
      try {
        const result = await this.rejectIndividualTrainingPlan(
          this.rejectPlanTarget.curricularProject.id,
          this.rejectPlanTarget.id,
          { reason: this.rejectPlanReason.trim() }
        )
        if (result) {
          this.mergePlanStatus(this.rejectPlanTarget.id, {
            status: result.status,
            rejectedMessage: result.rejectedMessage
          })
          this.rejectPlanModal.hide()
        }
      } finally {
        this.isRejectingPlan = false
      }
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <div id="rejectIndividualTrainingPlanModal" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Rebutjar pla formatiu individual</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Tanca"
            ></button>
          </div>
          <div class="modal-body">
            <label class="form-label fw-bold" for="rejectPlanReasonManage"
              >Motiu del rebutjament</label
            >
            <textarea
              id="rejectPlanReasonManage"
              v-model="rejectPlanReason"
              class="form-control"
              rows="3"
              placeholder="Escriu el motiu del rebutjament (mínim 8 caràcters)"
            ></textarea>
            <p v-if="rejectPlanError" class="text-danger small mb-0">{{ rejectPlanError }}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tanca</button>
            <button
              type="button"
              class="btn btn-danger"
              :disabled="isRejectingPlan"
              @click="submitRejectPlan"
            >
              <span
                v-if="isRejectingPlan"
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
              Rebutjar
            </button>
          </div>
        </div>
      </div>
    </div>

    <div id="planActionErrorModal" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">{{ actionErrorTitle }}</h5>
            <button
              type="button"
              class="btn-close btn-close-white"
              data-bs-dismiss="modal"
              aria-label="Tanca"
            ></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-danger mb-0 error-message-text">
              {{ actionErrorMessage }}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tanca</button>
          </div>
        </div>
      </div>
    </div>

    <div class="p-lg-4 p-1 overflow-auto">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h2 class="fw-bold m-0">{{ pageTitle }}</h2>
      </div>

      <div v-if="!canView" class="alert alert-warning mt-3">
        No tens permisos per veure els plans formatius individuals.
      </div>

      <template v-else>
        <!-- FILTRES -->
        <div class="p-3 alert pcc border text-white mt-4">
          <div class="row g-2 align-items-end">
            <div class="col-12 col-lg-3">
              <label class="form-label fw-bold small mb-1">Curs escolar</label>
              <select
                v-model="filters.schoolYearId"
                class="form-select"
                @change="onSchoolYearChange"
              >
                <option value="">--- Curs actual ---</option>
                <option v-for="year in schoolYears" :key="year.id" :value="year.id">
                  {{ year.course }}
                </option>
              </select>
            </div>
            <div class="col-12 col-lg-3">
              <label class="form-label fw-bold small mb-1">Cicle</label>
              <select
                v-model.number="filters.cycleId"
                class="form-select"
                @change="resetPageAndLoad"
              >
                <option :value="''">--- Tots els cicles ---</option>
                <option v-for="cicle in cycleFilterOptions" :key="cicle.id" :value="cicle.id">
                  {{ cicle.completeName }}
                </option>
              </select>
            </div>
            <div class="col-12 col-lg-3">
              <label class="form-label fw-bold small mb-1">Codi de mòdul</label>
              <input
                v-model="filters.moduleCode"
                type="text"
                class="form-control"
                placeholder="Ex: 0612"
                @keyup.enter="resetPageAndLoad"
                @blur="resetPageAndLoad"
              />
            </div>
            <div v-if="isAdmin" class="col-12 col-lg-3">
              <label class="form-label fw-bold small mb-1">Departament</label>
              <select
                v-model.number="filters.departmentId"
                class="form-select"
                @change="handleDepartmentFilterChange"
              >
                <option :value="''">--- Tots els departaments ---</option>
                <option v-for="dept in departmentOptions" :key="dept.id" :value="dept.id">
                  {{ dept.name }}
                </option>
              </select>
            </div>
            <div class="col-12 col-lg-3">
              <label class="form-label fw-bold small mb-1">Estat</label>
              <select v-model="filters.status" class="form-select" @change="resetPageAndLoad">
                <option :value="''">--- Tots els estats ---</option>
                <option v-for="status in statusOptions" :key="status" :value="status">
                  {{ status }}
                </option>
              </select>
            </div>
          </div>
          <div class="mt-2 text-end">
            <button class="btn btn-outline-light btn-sm" @click="clearFilters">
              Esborrar filtres
            </button>
          </div>
        </div>

        <!-- LLISTAT -->
        <div class="mt-4">
          <h4 class="h6 fw-bold">Plans</h4>
          <div v-if="loadingPlans" class="text-center py-3">
            <span class="spinner-border text-primary"></span>
          </div>
          <div v-else-if="plans.length === 0" class="alert alert-secondary">
            No hi ha plans formatius individuals amb els filtres actuals.
          </div>
          <div v-else class="table-responsive">
            <table class="table table-bordered table-striped align-middle">
              <thead class="table-light">
                <tr>
                  <th>Nom</th>
                  <th v-if="isAdmin">Departament</th>
                  <th>Cicle</th>
                  <th>Mòduls</th>
                  <th class="text-center">Total hores</th>
                  <th>Torn</th>
                  <th>Curs</th>
                  <th>Curs escolar</th>
                  <th>Estat</th>
                  <th class="text-center">Accions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="plan in plans" :key="plan.id">
                  <td>
                    {{ plan.name }}
                    <i
                      v-if="plan.requiresExtraordinaryAuthorizations"
                      class="bi bi-exclamation-triangle-fill text-warning ms-1"
                      :title="
                        plan.extraordinaryAuthorizations ||
                        'Requereix autoritzacions extraordinàries'
                      "
                    ></i>
                  </td>
                  <td v-if="isAdmin">{{ plan.curricularProject?.cycle?.department?.shortName }}</td>
                  <td>{{ plan.curricularProject?.cycle?.shortName }}</td>
                  <td>{{ getModulesLabel(plan) }}</td>
                  <td class="text-center">{{ plan.totalHours }}h</td>
                  <td>
                    <span class="badge bg-info text-dark">{{ getTurnLabel(plan.turn) }}</span>
                  </td>
                  <td>{{ plan.courseLevel === 2 ? '2n' : '1r' }}</td>
                  <td>{{ plan.courseYear }}</td>
                  <td>
                    <span
                      class="badge"
                      :class="statusClass(plan.status)"
                      :title="plan.status === 'rebutjada' ? plan.rejectedMessage?.reason : ''"
                    >
                      {{ plan.status }}
                    </span>
                  </td>
                  <td class="text-center">
                    <div class="btn-group" role="group">
                      <button
                        class="btn btn-sm btn-info"
                        title="Veure cicle"
                        @click="viewPlanCycle(plan)"
                      >
                        <i class="bi bi-eye-fill"></i>
                      </button>
                      <button
                        class="btn btn-sm btn-outline-danger"
                        title="Veure PDF (Annex I)"
                        :disabled="downloadingPlanId === plan.id"
                        @click="handleDownloadPlanPdf(plan)"
                      >
                        <span
                          v-if="downloadingPlanId === plan.id"
                          class="spinner-border spinner-border-sm"
                        ></span>
                        <i v-else class="bi bi-file-earmark-pdf-fill"></i>
                      </button>
                      <button
                        v-if="plan.status === 'enviada' && isPlanOfCurrentSchoolYear(plan)"
                        class="btn btn-sm btn-outline-success"
                        title="Aprovar"
                        :disabled="changingStatusPlanId === plan.id"
                        @click="handleApprovePlan(plan)"
                      >
                        <i class="bi bi-check2-circle"></i>
                      </button>
                      <button
                        v-if="
                          ['enviada', 'rebutjada'].includes(plan.status) &&
                          isPlanOfCurrentSchoolYear(plan)
                        "
                        class="btn btn-sm btn-outline-danger"
                        title="Rebutjar"
                        @click="openRejectPlanModal(plan)"
                      >
                        <i class="bi bi-x-circle"></i>
                      </button>
                      <button
                        v-if="plan.status !== 'pendent' && isPlanOfCurrentSchoolYear(plan)"
                        class="btn btn-sm btn-outline-warning"
                        title="Posar com a pendent"
                        :disabled="changingStatusPlanId === plan.id"
                        @click="handleSetPendingPlan(plan)"
                      >
                        <i class="bi bi-unlock-fill"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-if="totalItems > 0"
            class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2"
          >
            <span class="text-secondary small">
              {{ totalItems }} plans · Pàgina {{ currentPage }} de {{ totalPages }}
            </span>
            <div class="btn-group">
              <button
                class="btn btn-sm btn-outline-secondary"
                :disabled="currentPage <= 1 || loadingPlans"
                @click="goToPage(currentPage - 1)"
              >
                <i class="bi bi-chevron-left"></i> Anterior
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                :disabled="currentPage >= totalPages || loadingPlans"
                @click="goToPage(currentPage + 1)"
              >
                Següent <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
.error-message-text {
  white-space: pre-line;
  font-size: 1.05rem;
  line-height: 1.5;
}
</style>
