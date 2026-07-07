<script>
import { mapActions } from 'pinia'
import { api } from '@/repositories/api'
import { useDataStore } from '../stores/data'

const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 90

export default {
  props: {
    syllabusId: {
      type: Number,
      required: true
    },
    moduleName: {
      type: String,
      required: true
    },
    btnClass: {
      type: String,
      default: ' col-sm-5 col-12'
    }
  },
  data() {
    return {
      isLoading: false,
      status: '',
      jobId: '',
      downloadUrl: ''
    }
  },
  computed: {
    buttonText() {
      if (this.isLoading) return 'Exportant a Moodle...'
      if (this.downloadUrl) return 'Descarregar Aules'

      return 'Exportar a Moodle'
    },
    statusLabel() {
      if (!this.status) return ''
      if (this.status === 'completed' && this.downloadUrl) return 'Export preparat'
      if (this.status === 'completed') return 'Export completat'
      if (this.status === 'failed') return 'Export fallit'
      if (this.status === 'running') return 'Generant export...'
      if (this.status === 'queued') return 'Export en cua...'

      return this.status
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    async handleClick() {
      if (this.downloadUrl) {
        await this.downloadExport()
        return
      }

      await this.startExport()
    },
    async startExport() {
      try {
        this.isLoading = true
        this.status = 'queued'
        this.downloadUrl = ''

        const response = await api.createMoodleExport(this.syllabusId)
        this.jobId = response.data.job_id
        this.addMessage('success', 'Exportació Moodle iniciada')
        await this.pollUntilFinished()
      } catch (error) {
        this.status = ''
        this.addMessage('error', error)
      } finally {
        this.isLoading = false
      }
    },
    async pollUntilFinished() {
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
        await this.wait(POLL_INTERVAL_MS)

        const response = await api.getMoodleExportStatus(this.jobId)
        this.status = response.data.status

        if (response.data.status === 'completed') {
          this.downloadUrl = response.data.download_url || `/api/moodle-export/${this.jobId}/download`
          await this.downloadExport()
          return
        }

        if (response.data.status === 'failed') {
          throw new Error(response.data.error || "L'exportació Moodle ha fallat")
        }
      }

      throw new Error("L'exportació Moodle continua en procés. Torna-ho a intentar en uns minuts.")
    },
    async downloadExport() {
      const response = await api.downloadMoodleExport(this.jobId)
      const url = URL.createObjectURL(
        new Blob([response.data], {
          type: 'application/vnd.moodle.backup'
        })
      )
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `moodle_${this.syllabusId}_${this.removeBadCharactersForFileName(this.moduleName)}.mbz`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      this.addMessage('success', 'Exportació Moodle completada')
    },
    wait(milliseconds) {
      return new Promise((resolve) => {
        setTimeout(resolve, milliseconds)
      })
    },
    removeBadCharactersForFileName(str) {
      return String(str || '')
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, '_')
    }
  }
}
</script>

<template>
  <div class="text-center m-2">
    <button
      @click="handleClick"
      class="btn btn-success"
      :class="btnClass"
      :disabled="isLoading"
      title="Exportar curs restaurable Moodle"
    >
      <span
        v-if="isLoading"
        class="spinner-border spinner-border-sm me-1"
        aria-hidden="true"
      ></span>
      <i v-else class="bi bi-box-arrow-up-right"></i>
      {{ buttonText }}
    </button>
    <div v-if="statusLabel" class="small text-muted mt-1">{{ statusLabel }}</div>
  </div>
</template>
