<script>
import { mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import { api } from '../repositories/api.js'

const API_BASE_URL = import.meta.env.VITE_API_URL

export default {
  async mounted() {
    try {
      const { centerCode, cycleId } = this.$route.params
      const publicUrl = `${API_BASE_URL}public/pcc/${centerCode}/${cycleId}`
      const response = await fetch(publicUrl)
      const contentType = response.headers.get('content-type') || ''
      if (!response.ok || !contentType.includes('application/pdf')) {
        let msgError = "No s'ha pogut carregar el PCC"
        try {
          const errorJson = await response.json()
          msgError = errorJson.detail || errorJson.message || msgError
        } catch (parseError) {}
        throw new Error(msgError)
      }

      const blob = await response.blob()
      const filename = await this.buildFileName(centerCode, cycleId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      this.msg = 'PCC descarregat correctament'
      this.title = 'PCC Publicat'
    } catch (error) {
      const msgError = error?.message || 'Error carregant el PCC'
      this.addMessage('error', msgError)
      this.msg = msgError
      this.title = 'PCC no Publicat'
    }
  },
  data() {
    return {
      msg: 'Espere per favor',
      title: 'Carregant PCC...'
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    sanitizeFilePart(value) {
      if (!value) return ''
      const noSpaces = String(value).replace(/\s+/g, '')
      const normalized = noSpaces.normalize ? noSpaces.normalize('NFD') : noSpaces
      const withoutDiacritics = normalized.replace(/[\u0300-\u036f]/g, '')
      return withoutDiacritics.replace(/[^A-Za-z0-9_-]/g, '')
    },
    async buildFileName(centerCode, cycleId) {
      let cycleShortName = ''
      try {
        const response = await api.getCycleById(cycleId)
        cycleShortName = response.data?.shortName || response.data?.name || ''
      } catch (error) {
        cycleShortName = ''
      }
      const safeCenter = this.sanitizeFilePart(centerCode) || 'PCC'
      const safeCycle = this.sanitizeFilePart(cycleShortName || cycleId) || 'Cicle'
      const courseYear = new Date().getFullYear()
      return `${safeCenter}-${safeCycle}-${courseYear}-PCC.pdf`
    }
  }
}
</script>

<template>
  <main class="border shadow view-main row">
    <div class="col-12 col-sm-8 text-center mx-auto align-middle mt-5">
      <h2 class="text-center fw-bold text-primary p-2">{{ title }}</h2>
      <div class="text-center m-5 alert alert-info border border-info">
        <i class="bi bi-info-circle-fill fs-1"></i>
        <p class="col-12 h5 text-uppercase">{{ msg }}</p>
      </div>
    </div>
  </main>
</template>
