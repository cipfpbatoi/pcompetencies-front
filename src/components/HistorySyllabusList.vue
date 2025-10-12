<template>
  <div v-if="!loading && syllabusHistory.length" class="mt-4">
    <h5 class="fw-bold text-info mb-3 text-center">
      <i class="bi bi-clock-history me-2"></i>Històric de Propostes Didàctiques
    </h5>

    <table class="table table-bordered table-striped align-middle">
      <thead class="table-light">
      <tr>
        <th>Curs</th>
        <th>Versió</th>
        <th>Data de creació</th>
        <th class="text-center">Descarregar</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(item, index) in syllabusHistory" :key="index">
        <td>{{ item.schoolYear.course }}</td>
        <td>{{ item.fileVersions[0].version }}</td>
        <td>{{ formatDate(item.fileVersions[0].createdOn.date) }}</td>
        <td class="text-center">
          <button
            class="btn btn-outline-danger btn-sm"
            @click="downloadPdf(item.id)"
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
    No hi ha cap programació aprovada de cursos anteriors.
  </div>
</template>

<script>
import { api } from '../repositories/api.js'

export default {
  name: 'HistorySyllabusList',
  props: {
    syllabusId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      syllabusHistory: [],
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
        const response = await api.getApprovedDocumentsBySyllabusId(this.syllabusId)
        // Filtramos: solo los NO efectivos
        const filtered = response.data
          .filter((doc) => !doc.schoolYear.effective)
          .map((doc) => {
            const lastVersion = doc.fileVersions.sort((a, b) => b.version - a.version)[0]
            return { ...doc, fileVersions: [lastVersion] }
          })
        this.syllabusHistory = filtered.sort(
          (a, b) => a.schoolYear.course.localeCompare(b.schoolYear.course)
        )
      } catch (error) {
        this.error = 'Error carregant l’històric'
        console.error(error)
      }
      this.loading = false
    },

    formatDate(dateStr) {
      const date = new Date(dateStr)
      return date.toLocaleString('ca-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    async downloadPdf(approvedDocumentId) {
      try {
        const response = await api.getApprovedDocumentPdf(approvedDocumentId)
        const blob = new Blob([response.data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `programacio_${approvedDocumentId}.pdf`
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
