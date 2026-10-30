<script>
import { mapState, mapActions } from 'pinia'
import { Modal } from 'bootstrap'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api'
import { statusClass } from '@/utils/utils.js'
import { isSaoExportActive, saoStatusClass, saoStatusLabel } from '@/utils/sao.js'
import IndividualTrainingPlanViewModal from '@/components/IndividualTrainingPlanViewModal.vue'

const TURN_LABELS = {
  presential: 'Presencial',
  'half-presential': 'Semi-presencial'
}

export default {
  components: {
    IndividualTrainingPlanViewModal
  },
  computed: {
    ...mapState(useDataStore, ['user']),
    isAdmin() {
      return this.user.info?.roles?.includes('ROLE_ADMIN')
    },
    isCoordinadorFct() {
      return this.user.info?.roles?.includes('ROLE_COORDINADOR_FCT')
    },
    // El coordinador FCT també ha de poder consultar els plans de tots els departaments,
    // no només el propi, així que admin i coordinador FCT fan sempre la mateixa crida
    canView() {
      return this.isAdmin || this.isCoordinadorFct
    },
    pageTitle() {
      return 'Plans Formatius Individuals (tot el centre)'
    },
    // Quan hi ha un departament triat, el llistat de plans ja ve filtrat pel backend
    // per eixe departament: els cicles del select ixen dels cicles vistos fins ara
    // (this.cycleOptionsMap), acumulats pàgina a pàgina ja que el llistat de plans
    // ara ve paginat i no porta mai tots els plans d'un colp
    cycleFilterOptions() {
      if (!this.filters.departmentId) return this.cycles
      return Object.values(this.cycleOptionsMap)
    },
    totalPages() {
      return this.totalItems > 0 ? Math.ceil(this.totalItems / this.itemsPerPage) : 1
    },
    saoDetailsExport() {
      return this.saoDetailsPlan ? this.getSaoExport(this.saoDetailsPlan) : null
    }
  },
  data() {
    return {
      cycles: [],
      schoolYears: [],
      currentSchoolYear: '',
      plans: [],
      departmentOptions: [],
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
      saoExports: {},
      saoExportingPlanId: null,
      saoPollTimers: {},
      saoDetailsModal: null,
      saoDetailsPlan: null,
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
    this.saoDetailsModal = new Modal(document.getElementById('saoExportDetailsModal'))
  },
  beforeUnmount() {
    this.clearSaoPolls()
  },
  methods: {
    async initPage() {
      if (this.pageInitialized) return
      this.pageInitialized = true
      try {
        const [cyclesResponse, schoolYearsResponse, currentDataResponse, departmentsResponse] =
          await Promise.all([
            api.getCycles(),
            api.getSchoolYears(),
            api.getCurrentData(),
            api.getDepartments()
          ])
        this.cycles = cyclesResponse.data
        this.schoolYears = schoolYearsResponse.data
        this.currentSchoolYear = currentDataResponse.data?.currentSchoolYear?.course || ''
        // El llistat de departaments del filtre ve de /departments (tots els departaments
        // del centre), no dels plans ja carregats: així el filtre permet triar un
        // departament encara que no tinga cap pla visible amb els filtres actuals
        this.departmentOptions = departmentsResponse.data.map((department) => ({
          id: department.id,
          name: department.name
        }))
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
      'approveIndividualTrainingPlan',
      'rejectIndividualTrainingPlan',
      'setPendingIndividualTrainingPlan'
    ]),
    statusClass(status) {
      return statusClass(status)
    },
    saoStatusClass(status) {
      return saoStatusClass(status)
    },
    saoStatusLabel(status) {
      return saoStatusLabel(status)
    },
    isSaoExportActive(status) {
      return isSaoExportActive(status)
    },
    formatDateTime(value) {
      return value ? new Date(value).toLocaleString() : ''
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
    getSaoExport(plan) {
      return this.saoExports[plan.id] || null
    },
    getSaoStatus(plan) {
      return this.getSaoExport(plan)?.status || plan.saoExportStatus || null
    },
    canExportToSao(plan) {
      return plan.status === 'aprovada' && this.isPlanOfCurrentSchoolYear(plan)
    },
    getSaoActionTitle(plan) {
      const status = this.getSaoStatus(plan)
      if (['exported', 'exported_with_warnings'].includes(status)) {
        return 'La plantilla ja està sincronitzada amb SAÓ'
      }
      if (status === 'outdated') return 'Actualitzar les plantilles en SAÓ'
      if (['failed', 'partial_failure'].includes(status)) return 'Reintentar l’exportació a SAÓ'
      return 'Exportar les plantilles a SAÓ'
    },
    rememberSaoExport(planId, saoExport) {
      this.saoExports = { ...this.saoExports, [planId]: saoExport }
      this.mergePlanStatus(planId, { saoExportStatus: saoExport.status })
    },
    clearSaoPoll(planId) {
      if (!this.saoPollTimers[planId]) return
      window.clearInterval(this.saoPollTimers[planId])
      const timers = { ...this.saoPollTimers }
      delete timers[planId]
      this.saoPollTimers = timers
    },
    clearSaoPolls() {
      Object.keys(this.saoPollTimers).forEach((planId) => this.clearSaoPoll(planId))
    },
    startSaoPolling(plan) {
      this.clearSaoPoll(plan.id)
      const timer = window.setInterval(() => this.refreshSaoExport(plan, true), 3000)
      this.saoPollTimers = { ...this.saoPollTimers, [plan.id]: timer }
    },
    async refreshSaoExport(plan, silent = false) {
      try {
        const response = await api.getIndividualTrainingPlanSaoExport(
          plan.curricularProject.id,
          plan.id
        )
        this.rememberSaoExport(plan.id, response.data)
        if (!isSaoExportActive(response.data.status)) {
          this.clearSaoPoll(plan.id)
        }
        return response.data
      } catch (error) {
        this.clearSaoPoll(plan.id)
        if (!silent) this.showActionError('No s’ha pogut consultar SAÓ', error)
        return null
      }
    },
    async handleSaoExport(plan) {
      const status = this.getSaoStatus(plan)
      const action = ['failed', 'partial_failure'].includes(status)
        ? 'reintentar l’exportació de'
        : status
          ? 'actualitzar'
          : 'exportar'
      if (
        !confirm(
          `Vas a ${action} en SAÓ una plantilla per cada mòdul del pla "${plan.name}". Vols continuar?`
        )
      ) {
        return
      }

      this.saoExportingPlanId = plan.id
      try {
        const response = await api.exportIndividualTrainingPlanToSao(
          plan.curricularProject.id,
          plan.id
        )
        this.rememberSaoExport(plan.id, response.data)
        if (isSaoExportActive(response.data.status)) {
          this.startSaoPolling(plan)
        }
        this.addMessage(
          'success',
          response.status === 202
            ? 'L’exportació a SAÓ ha quedat en cua'
            : 'Les plantilles ja estaven sincronitzades amb SAÓ'
        )
      } catch (error) {
        this.showActionError('No s’ha pogut iniciar l’exportació a SAÓ', error)
      } finally {
        this.saoExportingPlanId = null
      }
    },
    async openSaoDetails(plan) {
      this.saoDetailsPlan = plan
      await this.refreshSaoExport(plan)
      this.saoDetailsModal.show()
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
    // El llistat ara ve paginat: no podem derivar la llista completa de cicles d'un sol
    // llistat (a diferència dels departaments, que ixen tots de /stats), així que anem
    // acumulant els cicles que veiem a cada pàgina carregada
    captureCycleOptions() {
      if (!this.filters.departmentId) return
      this.plans.forEach((plan) => {
        const cycle = plan.curricularProject?.cycle
        if (cycle?.id && !this.cycleOptionsMap[cycle.id]) {
          this.cycleOptionsMap[cycle.id] = cycle
        }
      })
    },
    applyPlansResponse(data) {
      this.clearSaoPolls()
      this.plans = data['hydra:member'] || data
      this.totalItems =
        typeof data['hydra:totalItems'] === 'number' ? data['hydra:totalItems'] : this.plans.length
      this.captureCycleOptions()
      this.plans.forEach((plan) => {
        if (plan.saoExportStatus) {
          this.saoExports = {
            ...this.saoExports,
            [plan.id]: {
              ...(this.saoExports[plan.id] || { modules: [] }),
              status: plan.saoExportStatus
            }
          }
        }
        if (isSaoExportActive(this.getSaoStatus(plan))) {
          this.startSaoPolling(plan)
        }
      })
    },
    async loadPlans() {
      if (!this.canView) return
      try {
        this.loadingPlans = true
        const response = await api.getIndividualTrainingPlansCenter(this.getListParams(true))
        this.applyPlansResponse(response.data)
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
    viewPlan(plan) {
      this.$refs.viewPlanModalRef?.show(plan)
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

    <div id="saoExportDetailsModal" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Exportació a SAÓ</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Tanca"
            ></button>
          </div>
          <div v-if="saoDetailsExport" class="modal-body">
            <div class="d-flex align-items-center gap-2 mb-3">
              <strong>{{ saoDetailsPlan?.name }}</strong>
              <span class="badge" :class="saoStatusClass(saoDetailsExport.status)">
                {{ saoStatusLabel(saoDetailsExport.status) }}
              </span>
            </div>
            <div v-if="saoDetailsExport.errorMessage" class="alert alert-warning">
              {{ saoDetailsExport.errorMessage }}
            </div>
            <div class="table-responsive">
              <table class="table table-sm table-bordered align-middle mb-0">
                <thead>
                  <tr>
                    <th>Mòdul</th>
                    <th>Descripció</th>
                    <th>Estat</th>
                    <th>Resultat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="moduleExport in saoDetailsExport.modules || []" :key="moduleExport.moduleCode">
                    <td>{{ moduleExport.moduleCode }}</td>
                    <td>{{ moduleExport.description }}</td>
                    <td>
                      <span class="badge" :class="saoStatusClass(moduleExport.status)">
                        {{ saoStatusLabel(moduleExport.status) }}
                      </span>
                    </td>
                    <td>
                      <div v-if="moduleExport.errorMessage" class="text-danger mb-1">
                        {{ moduleExport.errorMessage }}
                      </div>
                      <div v-if="moduleExport.issues?.length">
                        <ul class="mb-1 ps-3">
                          <li
                            v-for="(issue, index) in moduleExport.issues"
                            :key="`${issue.code}-${issue.action}-${index}`"
                          >
                            <span class="badge bg-warning text-dark me-1">
                              {{ issue.action === 'assigned' ? 'Assignada amb avís' : 'Omesa' }}
                            </span>
                            {{ issue.message }}
                          </li>
                        </ul>
                        <small v-if="moduleExport.exportedAt" class="text-secondary">
                          Exportat {{ formatDateTime(moduleExport.exportedAt) }}
                        </small>
                      </div>
                      <span
                        v-else-if="!moduleExport.errorMessage && moduleExport.exportedAt"
                        class="text-success"
                      >
                        Exportat {{ formatDateTime(moduleExport.exportedAt) }}
                      </span>
                      <span v-else-if="!moduleExport.errorMessage" class="text-secondary">—</span>
                    </td>
                  </tr>
                  <tr v-if="!(saoDetailsExport.modules || []).length">
                    <td colspan="4" class="text-center text-secondary">
                      Encara no hi ha detall per mòduls.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tanca</button>
          </div>
        </div>
      </div>
    </div>

    <IndividualTrainingPlanViewModal ref="viewPlanModalRef" />

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
            <div class="col-12 col-lg-3">
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
                  <th>Departament</th>
                  <th>Cicle</th>
                  <th>Mòduls</th>
                  <th class="text-center">Total hores</th>
                  <th>Torn</th>
                  <th>Curs</th>
                  <th>Curs escolar</th>
                  <th>Estat</th>
                  <th>SAÓ</th>
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
                  <td>{{ plan.curricularProject?.cycle?.department?.shortName }}</td>
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
                  <td>
                    <button
                      v-if="getSaoStatus(plan)"
                      type="button"
                      class="badge border-0"
                      :class="saoStatusClass(getSaoStatus(plan))"
                      title="Veure el detall de l’exportació"
                      @click="openSaoDetails(plan)"
                    >
                      <span
                        v-if="isSaoExportActive(getSaoStatus(plan))"
                        class="spinner-border spinner-border-sm me-1"
                        aria-hidden="true"
                      ></span>
                      {{ saoStatusLabel(getSaoStatus(plan)) }}
                    </button>
                    <span v-else class="text-secondary small">No exportat</span>
                  </td>
                  <td class="text-center">
                    <div class="btn-group" role="group">
                      <button class="btn btn-sm btn-info" title="Veure pla" @click="viewPlan(plan)">
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
                        v-if="
                          canExportToSao(plan) &&
                          !['exported', 'exported_with_warnings'].includes(getSaoStatus(plan))
                        "
                        class="btn btn-sm btn-outline-primary"
                        :title="getSaoActionTitle(plan)"
                        :disabled="
                          saoExportingPlanId === plan.id ||
                          isSaoExportActive(getSaoStatus(plan))
                        "
                        @click="handleSaoExport(plan)"
                      >
                        <span
                          v-if="
                            saoExportingPlanId === plan.id ||
                            isSaoExportActive(getSaoStatus(plan))
                          "
                          class="spinner-border spinner-border-sm"
                        ></span>
                        <i v-else class="bi bi-cloud-arrow-up-fill"></i>
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
