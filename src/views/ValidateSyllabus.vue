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
      errors: false
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    async validate() {
      try {
        const response = await api.syllabusValidate(this.syllabus.id)
        this.isValid = response.data.error
        this.errors = response.data.reasons

      } catch (error) {
        this.addMessage('error', error)
      }
    },
    sendSyllabus() {
      if (confirm('Una vegada enviada ja no es pot modificar la programació. Vols continuar?')) {
        // send
      }
    },
    async showPdf() {
      try {
        const response = await api.getPdf(this.syllabus.id)
        if (!response.ok) {
          this.addMessage('error', response)
        }
        const url = URL.createObjectURL(response.data)
        const pdfWindow = window.open()
        if (pdfWindow) {
          pdfWindow.document.write(`<iframe src="${url}" width="100%" height="100%"></iframe>`)
        } else {
          this.addMessage(
            'error',
            "No s'ha pogut obrir la nova finestra. Configura les Preferències del teu navegador"
          )
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
      <div>
        <button @click="validate" class="btn btn-secondary" title="Validar" :disabled="isValid">
          Validar programació
        </button>
      </div>
      <div v-if="!isValid">
        <div class="bg-danger m-1">
          <p class="text-white">
            {{
              errors
                ? "La programació te errors i has de corregir-los abans d'enviar-la"
                : "Has de validar la programació abans d'enviar-la"
            }}
          </p>
        </div>
        <br />
        <div v-if="errors">
          <h3>Errors detectats</h3>
          <div v-if="errors.learningSituations">
            <h4>Situacions d'aprenentatge</h4>
            <ul>
              <li v-for="ls in errors.learningSituations" :key="ls">
                S.A. {{ ls.learningSituationPosition }}
                <ul>
                  <li v-for="error in ls.errors" :key="error">{{ error }}</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div v-else>
        <button
          @click="sendSyllabus"
          class="btn btn-secondary"
          title="Vore PDF"
          :disabled="!isValid"
        >
          Enviar programació al Departament
        </button>
      </div>

      <div>
        <button @click="showPdf" class="btn btn-secondary" title="Vore PDF">
          {{ isValid ? 'Vore PDF' : 'Vore esborrany' }}
        </button>
      </div>
      <br />
    </div>
  </main>
</template>
