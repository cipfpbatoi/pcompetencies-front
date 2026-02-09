<script>
import { mapActions } from 'pinia'
import { useDataStore } from '../stores/data'

const API_BASE_URL = import.meta.env.VITE_API_URL

export default {
  async mounted() {
    try {
      const { collegeCode, cycleId, moduleCode, turn } = this.$route.params
      const publicUrl = `${API_BASE_URL}public/syllabus/${collegeCode}/${cycleId}/${moduleCode}/${turn}`
      const response = await fetch(publicUrl)
      const contentType = response.headers.get('content-type') || ''
      if (!response.ok || !contentType.includes('application/pdf')) {
        let msgError = "No s'ha pogut carregar la programació"
        try {
          const errorJson = await response.json()
          msgError = errorJson.detail || errorJson.message || msgError
        } catch (parseError) {}
        throw new Error(msgError)
      }

      response.body?.cancel?.()

      this.msg = 'Programació oberta en una altra pestanya del navegador'
      this.title = 'Programació Publicada'
      const opened = window.open(publicUrl, '_blank', 'noopener')
      if (!opened) {
        window.location.href = publicUrl
      }
    } catch (error) {
      const msgError = error?.message || 'Error carregant la programació'
      this.addMessage('error', msgError)
      this.msg = msgError
      this.title = 'Programació no Publicada'
    }
  },
  data() {
    return {
      msg: 'Espere per favor',
      title: 'Carregant programació...'
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage'])
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
