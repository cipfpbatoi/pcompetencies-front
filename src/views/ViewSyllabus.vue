<script>
import { api } from '@/repositories/api'
import { mapActions } from 'pinia'
import { useDataStore } from '../stores/data'

export default {
  props: {
    collegeCode: {
      type: String,
      required: true
    },
    cycleId: {
      type: String,
      required: true
    },
    moduleCode: {
      type: String,
      required: true
    },
    turn: {
      type: String,
      required: true
    }
  },
  async mounted() {
    try {
      const response = await api.getPublicPdf(
        this.collegeCode,
        this.cycleId,
        this.moduleCode,
        this.turn
      )
      if (response.status !== 200) {
        this.addMessage('error', response)
      }
      const url = URL.createObjectURL(response.data)
      document.write(`<iframe src="${url}" width="100%" height="100%"></iframe>`)
    } catch (error) {
      this.addMessage('error', error)
      this.msg = error.detail || error.message
    }
  },
  data() {
    return {
      msg: 'Espere per favor'
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <h2 class="text-center fw-bold text-primary p-2">Carregant programació</h2>
    <div class="container-fluid px-lg-4">
      <p>{{ msg }}</p>
    </div>
  </main>
</template>
