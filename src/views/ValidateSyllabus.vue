<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'

export default {
  components: {
    AppBreadcrumb
  },
  computed: {
    ...mapState(useDataStore, ['syllabus'])
  },
  data() {
    return {
      isValid: false,
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    sendSyllabus() {
      if (confirm('Una vegada enviada ja no es pot modificar la programació. Vols continuar?')) {
        // send
      }
    },
    async showPdf() {
      try {
        const response = await api.getPdf(this.syllabus.id);
        if (!response.ok) {
            this.addMessage('error', response);
        }
        const url = URL.createObjectURL(response.data);
        const pdfWindow = window.open();
        if (pdfWindow) {
            pdfWindow.document.write(`<iframe src="${url}" width="100%" height="100%"></iframe>`);
        } else {
            this.addMessage('error', "No s'ha pogut obrir la nova finestra. Configura les Preferències del teu navegador");
        }      
      } catch (error) {
        this.addMessage('error', error)
        return
      }
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <app-breadcrumb :actualStep="10" :done="false"></app-breadcrumb>
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }}) - {{ syllabus.courseYear }}</h2>
      <h2>10. Validar i enviar la programació</h2>
      <div class="bg-danger m-1">
        <p class="text-white">La programació te errors i has de corregir-los abans d'enviar-la</p>
      </div>
      <div>
        <button
        @click=""
        class="btn btn-secondary"
        title="Validar"
        disabled
      >
        Validar programació
      </button>
      </div>
      <br>
      <div>
        <button
        @click="showPdf"
        class="btn btn-secondary"
        title="Vore PDF"
      >
        {{ isValid ? 'Vore PDF' : 'Vore esborrany' }}
      </button>
      </div>
      <br>
      <div>
        <button
        @click="sendSyllabus"
        class="btn btn-secondary"
        title="Vore PDF"
        :disabled="!isValid"
      >
        Enviar programació al Departament
      </button>
      </div>
    </div>
  </main>
</template>
