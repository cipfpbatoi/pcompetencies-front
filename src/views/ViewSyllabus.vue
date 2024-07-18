<script>
import { api } from '@/repositories/api'
import { mapActions } from 'pinia'
import { useDataStore } from '../stores/data'

export default {
  async mounted() {
    try {
      const collegeCode = this.$route.params.collegeCode;
      const cycleId = this.$route.params.cycleId;
      const moduleCode = this.$route.params.moduleCode;
      const turn = this.$route.params.turn;
      const response = await api.getPublicPdf(collegeCode, cycleId, moduleCode, turn)
      if (response.status !== 200) {
        this.addMessage('error', response)
        return
      }
      const url = URL.createObjectURL(new Blob([response.data], {
        type: 'application/pdf'
      }))
      this.msg = 'Programació oberta en una altra Pestanya del navegador'
      this.title = 'Programació Publicada'
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('open', 'syllabus_'+ collegeCode + '_' + cycleId + '_' + moduleCode + '_' + turn + '.pdf')
      document.body.appendChild(link)
      link.click()
    } catch (error) {
      const responseObj = await error.response.data.text();
      const errorJSON = JSON.parse(responseObj);
      const msgError = errorJSON.detail || errorJSON.message;
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
