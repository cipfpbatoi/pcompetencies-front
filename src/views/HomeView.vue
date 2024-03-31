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
    try {
      const response = await api.getCycles()
      this.cycles = response.data
    } catch (error) {
      this.addMessage('error', error)
    } finally {
      this.syllabuses = []
    }
  },
  computed: {
    ...mapState(useDataStore, ['cycle']),
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
    async fetchSyl() {
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
  <main>
    <app-breadcrumb :actualStep="1" :done="done"></app-breadcrumb>
    <div>
      <label>Ciclo</label>
      <select
        v-model="cycleSelect"
        @change="getModules"
        class="form-select"
        aria-label="Selecciona cycleSelect"
      >
        <option value="">-- Selecciona ciclo --</option>
        <option v-for="cycleSelect in cycles" :key="cycleSelect.id" :value="cycleSelect.id">
          {{ cycleSelect.completeName }}
        </option>
      </select>
    </div>
    <div v-if="cycleSelect">
      <label>Mòdul</label>
      <select
        v-model="moduleSelect"
        @change="fetchSyl"
        class="form-select"
        aria-label="Default select example"
      >
        <option value="">-- Selecciona mòdul --</option>
        <option v-for="module in cycle.modules" :key="module.code" :value="module.code">
          {{ module.name }}
        </option>
      </select>
    </div>
    <br />
    <div v-if="moduleSelect">
      <h3>Torns</h3>
      <ul>
        <li v-for="(turn, index) in cycle.availableTurns" :key="index">
          {{ turn.toUpperCase() }}:
          <button @click="getSyl(turn)" type="button btn-sm">
            {{ existsSyllabusInTurn(turn) ? 'Editar' : 'Crear nova programació' }}
          </button>
        </li>
      </ul>
    </div>
  </main>
</template>
