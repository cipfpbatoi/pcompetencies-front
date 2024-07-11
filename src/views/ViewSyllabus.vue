<script>
import { api } from '@/repositories/api'
import { mapActions } from 'pinia'
import { useDataStore } from '../stores/data'

export default {
  async mounted() {
    try {
      const response = await api.getPublicPdf(
        this.$route.params.collegeCode,
        this.$route.params.cycleId,
        this.$route.params.moduleCode,
        this.$route.params.turn
      )
      if (response.status !== 200) {
        this.addMessage('error', response)
      }
      const url = URL.createObjectURL(response.data)
      document.write(`<iframe src="${url}" width="100%" height="100%"></iframe>`)
    } catch (error) {
      const responseObj = await error.response.data.text();
      const errorJSON = JSON.parse(responseObj);
      const msgError = errorJSON.detail || errorJSON.message;
      this.addMessage('error', msgError)
      this.msg = msgError
      this.title = 'Programació no encontrada'
    }
  },
  data() {
    return {
      msg: 'Espere per favor',
      title: 'Carregant programació...'
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
  }
}
</script>

<template>
  <main class="border shadow view-main row">
    <div class="col-12 col-sm-8 text-center mx-auto align-middle mt-5">
      <h2 class="text-center fw-bold text-primary p-2">{{ title }}</h2>
      <div class="text-center m-5 alert alert-info border border-info">
        <i class="bi bi-info-circle-fill fs-1"></i>
        <p class="col-12 h5 text-uppercase ">{{ msg }}</p>
      </div>
    </div>
  </main>
</template>
