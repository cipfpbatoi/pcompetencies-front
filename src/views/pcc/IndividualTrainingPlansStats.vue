<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api'
import { statusClass } from '@/utils/utils.js'

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
      if (this.isAdmin) return 'Estadístiques Plans Formatius Individuals (tot el centre)'
      if (this.isCoordinadorFct) {
        const name = this.user.info?.department?.shortName || this.user.info?.department?.name
        return name
          ? `Estadístiques Plans Formatius Individuals (${name})`
          : 'Estadístiques Plans Formatius Individuals'
      }
      return 'Estadístiques Plans Formatius Individuals'
    },
    // Unifica la vista per departament: l'admin veu tots els departaments amb els seus cicles
    // (ja inclosos a la resposta de /stats), el coordinador FCT veu una única targeta amb el
    // seu propi departament i els cicles obtinguts de /department/{id}/cycles-stats
    departmentCards() {
      if (this.isAdmin) return this.stats?.byDepartment || []
      if (this.isCoordinadorFct && this.stats) {
        const name =
          this.user.info?.department?.shortName ||
          this.user.info?.department?.name ||
          'El meu departament'
        return [
          {
            departmentId: this.ownDepartmentId,
            departmentName: name,
            cycles: this.stats.cycles || []
          }
        ]
      }
      return []
    }
  },
  data() {
    return {
      schoolYears: [],
      stats: null,
      loadingStats: false,
      schoolYearId: '',
      chartOrder: ['pendent', 'enviada', 'aprovada', 'rebutjada'],
      courseLevels: [
        { key: '1', label: '1r' },
        { key: '2', label: '2n' }
      ],
      initialized: false
    }
  },
  watch: {
    // L'usuari encara pot no estar carregat (App.vue el carrega de forma asíncrona
    // sense bloquejar el muntatge de la vista), així que esperem a que canView
    // passe a true per inicialitzar, en lloc de comprovar-ho només a mounted.
    canView: {
      immediate: true,
      handler(value) {
        if (value) this.initialize()
      }
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    async initialize() {
      if (this.initialized) return
      this.initialized = true
      try {
        const response = await api.getSchoolYears()
        this.schoolYears = response.data
      } catch (error) {
        this.addMessage('error', error)
      }
      await this.loadStats()
    },
    statusClass(status) {
      return statusClass(status)
    },
    getDepartmentTotalPlans(department) {
      return (department.cycles || []).reduce((sum, cycle) => sum + (cycle.totalPlans || 0), 0)
    },
    byCourseLevel(entity, courseLevelKey) {
      return entity?.byCourseLevel?.[courseLevelKey] || { totalPlans: 0, plansByStatus: {} }
    },
    hasApprovedPlan(cycle) {
      return (cycle.plansByStatus?.aprovada || 0) > 0
    },
    async loadStats() {
      if (!this.canView) return
      try {
        this.loadingStats = true
        const params = { schoolYearId: this.schoolYearId || undefined }
        if (this.isAdmin) {
          this.stats = (await api.getIndividualTrainingPlansStats(params)).data
        } else if (this.isCoordinadorFct && this.ownDepartmentId) {
          const response = await api.getIndividualTrainingPlansDepartmentCyclesStats(
            this.ownDepartmentId,
            params
          )
          this.stats = { cycles: response.data }
        }
      } catch (error) {
        this.addMessage('error', error)
      } finally {
        this.loadingStats = false
      }
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <div class="p-lg-4 p-1 overflow-auto">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h2 class="fw-bold m-0">{{ pageTitle }}</h2>
      </div>

      <div v-if="!canView" class="alert alert-warning mt-3">
        No tens permisos per veure les estadístiques.
      </div>

      <template v-else>
        <div class="row g-2 align-items-end mt-3">
          <div class="col-12 col-lg-3">
            <label class="form-label fw-bold small mb-1">Curs escolar</label>
            <select v-model="schoolYearId" class="form-select" @change="loadStats">
              <option value="">--- Curs actual ---</option>
              <option v-for="year in schoolYears" :key="year.id" :value="year.id">
                {{ year.course }}
              </option>
            </select>
          </div>
        </div>

        <div class="mt-3">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <h4 class="h6 fw-bold m-0">Cicles per departament</h4>
            <button
              class="btn btn-outline-secondary btn-sm"
              :disabled="loadingStats"
              @click="loadStats"
            >
              Actualitzar
            </button>
          </div>
          <div v-if="loadingStats" class="text-center py-3">
            <span class="spinner-border text-primary"></span>
          </div>
          <div v-else-if="departmentCards.length === 0" class="alert alert-secondary mt-2">
            No hi ha dades disponibles.
          </div>
          <div v-else class="row g-3 mt-1">
            <div
              class="col-12 col-xl-6"
              v-for="department in departmentCards"
              :key="department.departmentId"
            >
              <div class="border rounded p-3 bg-white h-100">
                <div class="fw-bold">{{ department.departmentName }}</div>
                <div class="text-secondary small mb-2">
                  Total de plans: {{ getDepartmentTotalPlans(department) }}
                  <template v-if="department.byCourseLevel">
                    <span
                      v-for="courseLevel in courseLevels"
                      :key="'dept-' + department.departmentId + '-' + courseLevel.key"
                      class="ms-2"
                    >
                      ({{ courseLevel.label }}:
                      {{ byCourseLevel(department, courseLevel.key).totalPlans }})
                    </span>
                  </template>
                </div>

                <p v-if="(department.cycles || []).length === 0" class="text-muted small mb-0">
                  Este departament no té cap cicle.
                </p>
                <div v-else class="table-responsive">
                  <table class="table table-sm table-bordered align-middle mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>Cicle</th>
                        <th class="text-center">Total</th>
                        <th v-for="status in chartOrder" :key="status" class="text-center">
                          {{ status }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <template v-for="cycle in department.cycles" :key="cycle.cycleId">
                        <tr :class="{ 'table-success': hasApprovedPlan(cycle) }">
                          <td>{{ cycle.cycleShortName }}</td>
                          <td class="text-center fw-bold">{{ cycle.totalPlans }}</td>
                          <td
                            v-for="status in chartOrder"
                            :key="cycle.cycleId + '-' + status"
                            class="text-center"
                          >
                            <span
                              v-if="cycle.plansByStatus?.[status]"
                              class="badge"
                              :class="statusClass(status)"
                            >
                              {{ cycle.plansByStatus[status] }}
                            </span>
                            <span v-else class="text-muted">—</span>
                          </td>
                        </tr>
                        <template v-if="cycle.byCourseLevel">
                          <tr
                            v-for="courseLevel in courseLevels"
                            :key="cycle.cycleId + '-course-' + courseLevel.key"
                            class="small text-secondary"
                          >
                            <td class="ps-4">└ {{ courseLevel.label }}</td>
                            <td class="text-center">
                              {{ byCourseLevel(cycle, courseLevel.key).totalPlans }}
                            </td>
                            <td
                              v-for="status in chartOrder"
                              :key="cycle.cycleId + '-' + courseLevel.key + '-' + status"
                              class="text-center"
                            >
                              <span
                                v-if="byCourseLevel(cycle, courseLevel.key).plansByStatus?.[status]"
                                class="badge"
                                :class="statusClass(status)"
                              >
                                {{ byCourseLevel(cycle, courseLevel.key).plansByStatus[status] }}
                              </span>
                              <span v-else class="text-muted">—</span>
                            </td>
                          </tr>
                        </template>
                      </template>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </main>
</template>
