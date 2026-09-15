<template>
  <div v-if="error" class="alert alert-danger mt-4 text-center">
    {{ error }}
  </div>

  <div v-else-if="!loading && pccHistory.length" class="mt-4">
    <h5 class="fw-bold text-info mb-3 text-center bg-secondary-subtle p-2">
      <i class="bi bi-clock-history me-2"></i>Historic del projecte curricular
    </h5>

    <table class="table table-bordered table-striped align-middle">
      <thead class="table-light">
        <tr>
          <th>Versio</th>
          <th>Data de creacio</th>
          <th class="text-center">Descarregar</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in pccHistory" :key="index">
          <td>{{ formatVersion(item.versionNumber) }}</td>
          <td>{{ formatDate(item.createdOn) }}</td>
          <td class="text-center">
            <button
              class="btn btn-outline-danger btn-sm"
              @click="downloadPdf(item)"
              title="Descarregar PDF"
            >
              <i class="bi bi-file-earmark-pdf-fill"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-else-if="loading" class="text-center my-4">
    <div class="spinner-border text-primary" role="status"></div>
  </div>

  <div v-else class="alert alert-secondary mt-4 text-center">
    No hi ha cap versio publicada anterior.
  </div>
</template>

<script>
import { api } from '../repositories/api.js'

export default {
  name: 'HistoryPccList',
  props: {
    pccId: {
      type: Number,
      required: true
    },
    pcc: {
      type: Object,
      default: null
    },
    cycle: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      pccHistory: [],
      loading: true,
      error: null
    }
  },
  async mounted() {
    await this.fetchHistory()
  },
  methods: {
    async fetchHistory() {
      this.loading = true
      this.error = null
      try {
        const response = await api.getApprovedDocumentsByPccId(this.pccId)
        const data = Array.isArray(response.data)
          ? response.data
          : response.data['hydra:member'] || []
        const mapped = data
          .map((doc) => ({
            approvedDocumentId: doc.id,
            createdOn: doc.createdOn || null
          }))
          .filter((doc) => doc.approvedDocumentId)

        const sortedByLatest = [...mapped].sort((a, b) => {
          const dateA = a.createdOn ? new Date(a.createdOn).getTime() : 0
          const dateB = b.createdOn ? new Date(b.createdOn).getTime() : 0
          return dateB - dateA
        })

        const [, ...withoutLatest] = sortedByLatest

        const sortedByOldest = [...withoutLatest].sort((a, b) => {
          const dateA = a.createdOn ? new Date(a.createdOn).getTime() : 0
          const dateB = b.createdOn ? new Date(b.createdOn).getTime() : 0
          return dateA - dateB
        })

        this.pccHistory = sortedByOldest.map((doc, index) => ({
          ...doc,
          versionNumber: index + 1
        }))
      } catch (error) {
        this.error = "Error carregant l'historic del PCC"
        console.error(error)
      }
      this.loading = false
    },
    formatDate(dateStr) {
      if (!dateStr) {
        return '-'
      }
      const date = new Date(dateStr)
      return date.toLocaleString('ca-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    formatVersion(version) {
      if (!version) {
        return '-'
      }
      return `v${version}`
    },
    sanitizeFilePart(value) {
      if (!value) return ''
      const noSpaces = String(value).replace(/\s+/g, '')
      const normalized = noSpaces.normalize ? noSpaces.normalize('NFD') : noSpaces
      const withoutDiacritics = normalized.replace(/[\u0300-\u036f]/g, '')
      return withoutDiacritics.replace(/[^A-Za-z0-9_-]/g, '')
    },
    getDownloadName(versionNumber) {
      const centerCode =
        this.pcc?.center?.code ||
        this.pcc?.centerCode ||
        this.pcc?.cycle?.center?.code ||
        this.pcc?.cycle?.centerCode ||
        this.cycle?.center?.code ||
        this.cycle?.centerCode ||
        'PCC'
      const cycleShortName =
        this.pcc?.cycle?.shortName || this.cycle?.shortName || this.cycle?.completeName || 'Cicle'
      const safeCenter = this.sanitizeFilePart(centerCode) || 'PCC'
      const safeCycle = this.sanitizeFilePart(cycleShortName) || 'Cicle'
      const courseYear = this.pcc?.courseYear || new Date().getFullYear()
      const versionPart = versionNumber ? `-v${versionNumber}` : ''
      return `${safeCenter}-${safeCycle}-${courseYear}-PCC${versionPart}.pdf`
    },
    async downloadPdf(item) {
      const { approvedDocumentId, versionNumber } = item || {}
      try {
        const response = await api.getApprovedPccDocumentPdf(this.pccId, approvedDocumentId)
        const blob = new Blob([response.data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = this.getDownloadName(versionNumber)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Error descarregant PDF:', error)
      }
    }
  }
}
</script>

<style scoped>
.table {
  font-size: 0.9rem;
}
</style>
