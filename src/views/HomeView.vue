<script>
import { api } from '../repositories/api.js'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'

export default {
  components: {
    AppBreadcrumb,
  },
  async mounted() {
    this.syllabuses = []
    try {
      const response = await api.getCycles()
      this.cycles = response.data
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
    }
  },
  data() {
    return {
      cycles: [],
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
    async getSyl(turn) {
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
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <app-breadcrumb :actualStep="1" :done="done"></app-breadcrumb>
    <div class="container-fluid px-lg-4" >
      <div class="form-group">
        <label class="form-label fw-bold">Ciclo</label>
        <select
          v-model="cycleSelect"
          @change="getModules"
          class="form-select form-control"
          aria-label="Selecciona cycleSelect">
          <option value="">-- Selecciona ciclo --</option>
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
          aria-label="Default select example">
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
            {{ (turn == 'presential') ? 'Presencial' : 'Semi-presencial' }}:
            <button @click="getSyl(turn)" class="btn btn-primary">
              {{ existsSyllabusInTurn(turn) ? 'Editar' : 'Crear nova programació' }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </main>
</template>
