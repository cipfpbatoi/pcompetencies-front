<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api'

export default {
  computed: {
    ...mapState(useDataStore, ['user']),
    isAdmin() {
      return this.user.info?.roles?.includes('ROLE_ADMIN')
    },
    isHeadDepartment() {
      return this.user.info?.roles?.includes('ROLE_HEAD_DEPARTMENT')
    },
    canViewStats() {
      return this.isAdmin || this.isHeadDepartment
    },
    departmentId() {
      return this.user.info?.department?.id || null
    },
    statsTitle() {
      if (this.isAdmin) return 'Estadistiques PCC (tots)'
      if (this.isHeadDepartment) {
        const name = this.user.info?.department?.shortName || this.user.info?.department?.name
        return name ? `Estadistiques PCC (${name})` : 'Estadistiques PCC (departament)'
      }
      return 'Estadistiques PCC'
    }
  },
  watch: {
    'user.info': {
      handler(newInfo) {
        if (!newInfo) return
        this.loadStats()
      },
      immediate: true
    }
  },
  data() {
    return {
      stats: null,
      statsLoading: false,
      statsLoaded: false,
      statusOrder: ['pendent', 'enviat', 'aprovat', 'rebutjat', 'verificat'],
      chartOrder: ['pendent', 'enviat', 'aprovat', 'rebutjat', 'verificat', 'no_comencats'],
      statusColors: {
        pendent: '#f0ad4e',
        enviat: '#5bc0de',
        aprovat: '#5cb85c',
        rebutjat: '#d9534f',
        verificat: '#198754',
        no_comencats: '#6c757d'
      },
      statusAliases: {
        pendent: ['pendent', 'pending'],
        enviat: ['enviat', 'sent'],
        aprovat: ['aprovat', 'approved'],
        rebutjat: ['rebutjat', 'rejected'],
        verificat: ['verificat', 'verified']
      }
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    async loadStats(force = false) {
      if (!this.canViewStats || this.statsLoading || (this.statsLoaded && !force)) return
      if (this.isHeadDepartment && !this.departmentId) {
        this.addMessage('error', "No s'ha pogut determinar el departament")
        return
      }
      try {
        this.statsLoading = true
        let response = null
        if (this.isAdmin) {
          response = await api.getPccStats()
        } else if (this.isHeadDepartment) {
          response = await api.getPccDepartmentStats(this.departmentId)
        }
        this.stats = response?.data || null
        this.statsLoaded = true
      } catch (error) {
        this.addMessage('error', error)
      }
      this.statsLoading = false
    },
    getStatusCount(statusKey) {
      if (statusKey === 'no_comencats') return this.getPendingToCreate()
      if (!this.stats?.byStatus) return 0
      const aliases = this.statusAliases[statusKey] || [statusKey]
      return aliases.reduce((sum, key) => sum + (this.stats.byStatus[key] || 0), 0)
    },
    getStatusTotal() {
      return this.chartOrder.reduce((sum, status) => sum + this.getStatusCount(status), 0)
    },
    getDepartmentStatusCount(department, statusKey) {
      if (statusKey === 'no_comencats') return this.getDepartmentPendingToCreate(department)
      if (!department?.projectsByStatus) return 0
      const aliases = this.statusAliases[statusKey] || [statusKey]
      return aliases.reduce((sum, key) => sum + (department.projectsByStatus[key] || 0), 0)
    },
    getDepartmentStatusTotal(department) {
      return this.chartOrder.reduce(
        (sum, status) => sum + this.getDepartmentStatusCount(department, status),
        0
      )
    },
    buildChartSegments(total, radius, getCount) {
      const circumference = 2 * Math.PI * radius
      let offset = 0
      return this.chartOrder
        .map((status) => {
          const value = getCount(status)
          const length = total ? (value / total) * circumference : 0
          const segment = {
            status,
            value,
            length,
            offset,
            circumference,
            color: this.statusColors[status]
          }
          offset += length
          return segment
        })
        .filter((segment) => segment.length > 0)
    },
    getMainChartSegments() {
      return this.buildChartSegments(this.getStatusTotal(), 42, (status) =>
        this.getStatusCount(status)
      )
    },
    getDepartmentChartSegments(department) {
      return this.buildChartSegments(this.getDepartmentStatusTotal(department), 32, (status) =>
        this.getDepartmentStatusCount(department, status)
      )
    },
    getPendingToCreate() {
      if (!this.stats) return 0
      const totalCycles = this.stats.totalCycles || 0
      const totalProjects = this.stats.totalProjects || 0
      return Math.max(totalCycles - totalProjects, 0)
    },
    getDepartmentPendingToCreate(department) {
      if (!department) return 0
      const totalCycles = department.totalCycles || 0
      const totalProjects = department.totalProjects || 0
      return Math.max(totalCycles - totalProjects, 0)
    },
    formatStatus(status) {
      const labels = {
        pendent: 'pendent',
        enviat: 'enviat',
        aprovat: 'aprovat',
        rebutjat: 'rebutjat',
        verificat: 'verificat',
        no_comencats: 'no començats',
        pending: 'pendent',
        sent: 'enviat',
        approved: 'aprovat',
        rejected: 'rebutjat',
        verified: 'verificat'
      }
      return labels[status] || status
    }
  }
}
</script>

<template>
  <div class="border-bottom border-3 pcc"></div>
  <main class="border shadow view-main">
    <div class="p-lg-4 p-1 overflow-auto">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h2 class="fw-bold m-0">{{ statsTitle }}</h2>
        <button
          class="btn btn-outline-secondary btn-sm"
          @click="loadStats(true)"
          :disabled="statsLoading"
        >
          Actualitzar
        </button>
      </div>
      <div v-if="!canViewStats" class="alert alert-warning mt-3">
        No tens permisos per veure les estadistiques.
      </div>
      <div v-else-if="statsLoading" class="text-center py-4">
        <span class="spinner-border text-primary m-auto"></span>
      </div>
      <div v-else-if="stats" class="mt-3">
        <div class="row g-4 align-items-start">
          <div class="col-12 col-lg-6">
            <div class="row g-3">
              <div class="col-12">
                <div class="border rounded p-2 bg-white h-100">
                  <div class="text-uppercase small text-secondary">Projectes</div>
                  <div class="h3 fw-bold mb-0">{{ stats.totalProjects }}</div>
                </div>
              </div>
              <div class="col-12">
                <div class="border rounded p-2 bg-white h-100">
                  <div class="text-uppercase small text-secondary">Cicles</div>
                  <div class="h3 fw-bold mb-0">{{ stats.totalCycles }}</div>
                </div>
              </div>
              <div class="col-12" v-if="stats.byDepartment?.length">
                <div class="border rounded p-2 bg-white h-100">
                  <div class="text-uppercase small text-secondary">Departaments</div>
                  <div class="h3 fw-bold mb-0">{{ stats.byDepartment.length }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-12 col-lg-6 text-center">
            <div class="status-chart">
              <svg class="chart-svg" viewBox="0 0 100 100">
                <g transform="rotate(-90 50 50)">
                  <circle
                    class="chart-base"
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#e9ecef"
                    stroke-width="16"
                    fill="none"
                  ></circle>
                  <circle
                    v-for="segment in getMainChartSegments()"
                    :key="segment.status"
                    class="chart-segment"
                    cx="50"
                    cy="50"
                    r="42"
                    :stroke="segment.color"
                    stroke-width="16"
                    fill="none"
                    :stroke-dasharray="`${segment.length} ${segment.circumference - segment.length}`"
                    :stroke-dashoffset="-segment.offset"
                  >
                    <title>{{ formatStatus(segment.status) }}: {{ segment.value }}</title>
                  </circle>
                </g>
              </svg>
              <div class="chart-center">
                <div class="chart-value">{{ getPendingToCreate() }}</div>
                <div class="chart-label">No començats</div>
              </div>
            </div>
            <div class="d-flex flex-wrap justify-content-center gap-3 mt-2">
              <div
                class="d-flex align-items-center gap-2"
                v-for="status in chartOrder"
                :key="status + '-legend'"
              >
                <span class="status-dot" :style="{ backgroundColor: statusColors[status] }"></span>
                <span class="small">
                  {{ formatStatus(status) }} ({{ getStatusCount(status) }})
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-4" v-if="stats.byDepartment?.length">
          <h4 class="h6 fw-bold mb-3">Per departament</h4>
          <div class="row g-3">
            <div
              class="col-12 col-md-6"
              v-for="department in stats.byDepartment"
              :key="department.departmentId"
            >
              <div class="border rounded p-3 bg-white h-100">
                <div class="fw-bold">{{ department.departmentName }}</div>
                <div class="text-secondary small">
                  Cicles: {{ department.totalCycles }} · Projectes: {{ department.totalProjects }}
                </div>
                <div class="department-chart">
                  <svg class="chart-svg" viewBox="0 0 100 100">
                    <g transform="rotate(-90 50 50)">
                      <circle
                        class="chart-base"
                        cx="50"
                        cy="50"
                        r="32"
                        stroke="#e9ecef"
                        stroke-width="20"
                        fill="none"
                      ></circle>
                      <circle
                        v-for="segment in getDepartmentChartSegments(department)"
                        :key="department.departmentId + '-' + segment.status"
                        class="chart-segment"
                        cx="50"
                        cy="50"
                        r="32"
                        :stroke="segment.color"
                        stroke-width="20"
                        fill="none"
                        :stroke-dasharray="`${segment.length} ${segment.circumference - segment.length}`"
                        :stroke-dashoffset="-segment.offset"
                      >
                        <title>{{ formatStatus(segment.status) }}: {{ segment.value }}</title>
                      </circle>
                    </g>
                  </svg>
                  <div class="chart-center">
                    <div class="chart-value">
                      {{ getDepartmentPendingToCreate(department) }}
                    </div>
                    <div class="chart-label">No començats</div>
                  </div>
                </div>
                <div class="d-flex flex-wrap justify-content-center gap-3 mt-2">
                  <div
                    class="d-flex align-items-center gap-2"
                    v-for="status in chartOrder"
                    :key="department.departmentId + '-' + status"
                  >
                    <span
                      class="status-dot"
                      :style="{ backgroundColor: statusColors[status] }"
                    ></span>
                    <span class="small">
                      {{ formatStatus(status) }}
                      ({{ getDepartmentStatusCount(department, status) }})
                    </span>
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
.status-chart {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  margin: 0 auto;
  position: relative;
}

.status-chart::after {
  content: '';
  position: absolute;
  inset: 18px;
  background: #fff;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px #e9ecef;
}

.department-chart {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  margin: 16px auto 0;
  position: relative;
}

.department-chart::after {
  content: '';
  position: absolute;
  inset: 14px;
  background: #fff;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px #e9ecef;
}

.chart-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  z-index: 1;
  padding: 0 12px;
  pointer-events: none;
}

.chart-value {
  font-weight: 700;
  font-size: 1.4rem;
  line-height: 1;
}

.chart-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6c757d;
  margin-top: 6px;
}

.chart-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.chart-segment {
  cursor: pointer;
  pointer-events: stroke;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
</style>
