<script>
import { api } from '../repositories/api.js'
import { mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'

export default {
  components: {
    AppBreadcrumb,
  },
  async mounted() {
    try {
      const response = await api.getCycles()
      this.cycles = response.data
      this.addMessage('success', 'Datos cargados')
    } catch (error) {
      this.addMessage('error', error)
    } finally {
      this.cycleInfo = {}
      this.syllabuses = []
    }
  },
  computed: {
    selectedModule() {
      return this.cycleInfo.modules.find((item) => item.code == this.module) || {}
    }
  },
  data() {
    return {
      cycles: [],
      cycle: '',
      cycleInfo: {},
      module: '',
      syllabuses: [],
      done: false
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage', 'fetchModule', 'fetchSyllabus']),
    async getModules() {
      if (this.cycle) {
        try {
          const response = await api.getCycleById(this.cycle)
          this.cycleInfo = response.data
        } catch (error) {
          this.cycleInfo = {}
          this.addMessage('error', error)
        } finally {
          this.syllabuses = []
        }
      }
      this.module = ''
      this.done = false
    },
    async fetchSyl() {
      try {
        const response = await api.getSyllabusByCycleAndModule(this.cycle, this.module)
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
            cycleId: this.cycle,
            moduleCode: this.module,
            turn
          })
          syllabus = response.data
          this.addMessage('success', 'Programació creada')
        } catch (error) {
          this.addMessage('error', error)
          return
        }
      }
      await Promise.all([
        this.fetchModule(this.module),
        this.fetchSyllabus(syllabus.id)
      ])
      this.$router.push('/impr-prop')
    },
    existsSyllabusInTurn(turn) {
      return this.syllabuses.find((item) => item.turn === turn)
    }
  }
}
</script>

<template>
  <main>
    <app-breadcrumb :actualStep="1" :done="done"></app-breadcrumb>
    <div>
      <label>Ciclo</label>
      <select
        v-model="cycle"
        @change="getModules"
        class="form-select"
        aria-label="Selecciona cycle"
      >
        <option value="">-- Selecciona ciclo --</option>
        <option v-for="cycle in cycles" :key="cycle.id" :value="cycle.id">
          {{ cycle.completeName }}
        </option>
      </select>
    </div>
    <div v-if="cycle">
      <label>Mòdul</label>
      <select
        v-model="module"
        @change="fetchSyl"
        class="form-select"
        aria-label="Default select example"
      >
        <option value="">-- Selecciona mòdul --</option>
        <option v-for="module in cycleInfo.modules" :key="module.code" :value="module.code">
          {{ module.name }}
        </option>
      </select>
    </div>
    <br />
    <div v-if="module">
      <h3>Torns</h3>
      <ul>
        <li v-for="(turn, index) in cycleInfo.availableTurns" :key="index">
          {{ turn.toUpperCase() }}:
          <button @click="getSyl(turn)" type="button btn-sm">
            {{ existsSyllabusInTurn(turn) ? 'Editar' : 'Crear nova programació' }}
          </button>
        </li>
      </ul>
    </div>
  </main>
</template>
