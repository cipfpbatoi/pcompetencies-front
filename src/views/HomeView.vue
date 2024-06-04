<script>
import { api } from '../repositories/api.js'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'

export default {
  async mounted() {
    this.syllabuses = []
    try {
      const [respCicles, respData] = await Promise.all([api.getCycles(), api.getCurrentData()])
      this.cycles = respCicles.data
      this.currentData = respData.data
      if (this.cycle.id) {
        this.cycleSelect = this.cycle.id
        await this.getModules()
        if (this.module.code) {
          this.moduleSelect = this.module.code
          this.getSyllabuses()
        }
      }
    } catch (error) {
      this.addMessage('error', error)
    }
  },
  computed: {
    ...mapState(useDataStore, ['cycle', 'module']),
    selectedModule() {
      return this.cycle.modules.find((item) => item.code == this.moduleSelect) || {}
    },
    canEdit() {
      const today = new Date()
      const initDateArray = this.currentData.syllabusStartDate?.split('/')
      const initDate = new Date(initDateArray[2], initDateArray[1] - 1, initDateArray[0])
      const finishDateArray = this.currentData.syllabusFinishDate?.split('/')
      const finDate = new Date(finishDateArray[2], finishDateArray[1] - 1, finishDateArray[0])
      if (today.getTime() >= initDate.getTime() && today.getTime() <= finDate.getTime()) {
        return true
      }
      return false
    }
  },
  data() {
    return {
      cycles: [],
      currentData: {},
      cycleSelect: '',
      moduleSelect: '',
      syllabuses: [],
      done: false
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage', 'fetchData', 'fetchCycle']),
    async getModules() {
      if (this.cycleSelect) {
        await this.fetchCycle(this.cycleSelect)
      }
      this.syllabuses = []
      this.moduleSelect = ''
      this.done = false
    },
    async getSyllabuses() {
      try {
        const response = await api.getSyllabusByCycleAndModule(this.cycleSelect, this.moduleSelect)
        this.syllabuses = response.data
      } catch (error) {
        this.syllabuses = []
        this.addMessage('error', error)
      }
    },
    async selectSyllabus(turn) {
      let syllabus = this.existsSyllabusInTurn(turn)
      if (!syllabus) {
        try {
          const response = await api.createSyllabus({
            cycleId: this.cycleSelect,
            moduleCode: this.moduleSelect,
            turn
          })
          syllabus = response.data
          this.addMessage('success', 'Programació creada')
        } catch (error) {
          this.addMessage('error', error)
          return
        }
      }
      await this.fetchData(this.moduleSelect, syllabus.id)
      this.$router.push('/context')
    },
    existsSyllabusInTurn(turn) {
      return this.syllabuses.find((item) => item.turn === turn)
    },
    statusClass(status) {
      switch (status) {
        case 'pendent':
          return 'bg-secondary'
        case 'enviada':
          return 'bg-warning'
        case 'rebutjada':
          return 'bg-danger'
        case 'acceptada':
          return 'bg-success'
        default:
          return 'bg-dark'
      }
    },
    async showPdf(turn) {
      try {
        const response = await api.getPdf(this.existsSyllabusInTurn(turn)?.id)
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
    <h2 class="text-center fw-bold text-primary p-lg-2">Tria la programació</h2>
    <div class="container-fluid px-lg-4">
      <div class="form-group">
        <label class="form-label fw-bold">Cicle</label>
        <select
          v-model="cycleSelect"
          @change="getModules"
          class="form-select form-control"
          aria-label="Selecciona cycleSelect"
        >
          <option value="">-- Selecciona cicle --</option>
          <option v-for="cycleSelect in cycles" :key="cycleSelect.id" :value="cycleSelect.id">
            {{ cycleSelect.completeName }}
          </option>
        </select>
      </div>
      <div v-if="cycleSelect" class="form-group fw-bold mt-3">
        <label>Mòdul</label>
        <select
          v-model="moduleSelect"
          @change="getSyllabuses"
          class="form-select form-control"
          aria-label="Default select example"
        >
          <option value="">-- Selecciona mòdul --</option>
          <option v-for="module in cycle.modules" :key="module.code" :value="module.code">
            {{ module.name }}
          </option>
        </select>
      </div>
      <br />
      <div v-if="moduleSelect" class="form-group">
        <h3>Torns</h3>
        <ul>
          <li v-for="(turn, index) in cycle.availableTurns" :key="index">
            {{ turn == 'presential' ? 'Presencial' : 'Semi-presencial' }}:
            <button
              @click="selectSyllabus(turn)"
              class="btn btn-primary position-relative"
              v-if="canEdit"
            >
              {{ existsSyllabusInTurn(turn) ? 'Editar la programació' : 'Crear nova programació' }}
              <span
                class="position-absolute top-0 start-100 translate-middle badge rounded-pill" :class="statusClass(syllabuses[index]?.status)"
              >
                {{ syllabuses[index]?.status }}
              </span>
            </button>
            <template v-else>
              <button
                v-if="existsSyllabusInTurn(turn)"
                @click="showPdf(turn)"
                class="btn btn-secondary"
                title="Vore PDF"
              >
                Vore PDF
              </button>
              <strong v-else>No hi ha programació</strong>
            </template>
          </li>
        </ul>
      </div>
    </div>
  </main>
</template>
