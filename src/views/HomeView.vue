<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import LrTable from '../components/LrTable.vue'

export default {
  components: {
    LrTable
  },
  computed: {
    ...mapState(useDataStore, ['cicles', 'modules', 'learningResults', 'programming']),
  },
  data() {
    return {
      cicle: '',
      module: '',
      done: false,
    }
  },
  methods: {
    ...mapActions(useDataStore, ['loadModules', 'loadModuleInfo', 'addProgramming']),
    getModules() {
      if (this.cicle) {
        this.loadModules(this.cicle)
      }
      this.module = ''
      this.done = false
    },
    getLearningResults() {
      if (this.module) {
        this.loadModuleInfo(this.cicle, this.module)
        this.done = true
      } 
    },
    async createProg() {
      await this.addProgramming(this.cicle, this.module)
      this.$router.push('/work-units')
    }
  }
}
</script>

<template>
  <main>
    <div class="bg-secondary text-white">
      Pas 1: selecciona mòdul -> 
      <button @click="$router.push('/work-units')" :disabled="!done">Següent pas</button>
    </div>
    <div>
      <label>Cicle</label>
      <select v-model="cicle" @change="getModules" class="form-select" aria-label="Selecciona cicle">
        <option value="">-- Selecciona cicle --</option>
        <option v-for="cicle in cicles" :key="cicle.id" :value="cicle.id">
          {{ cicle.complete_name }}
        </option>
      </select>
    </div>
    <div v-if="cicle">
      <label>Mòdul</label>
      <select v-model="module" @change="getLearningResults" class="form-select" aria-label="Default select example">
        <option value="">-- Selecciona mòdul --</option>
        <option v-for="module in modules" :key="module.code" :value="module.code">
          {{ module.name }}
        </option>
      </select>
    </div>
    <br>
    <div v-if="module">
      <h3>Programació</h3>
      <RouterLink to="/work-units" v-if="programming.id">Editar programació</RouterLink>
      <p v-else>No hi ha programació d'aquest mòdul. <button @click="createProg" type="button btn-sm">Crear nova programació</button></p>
    </div>
    <br>
    <div v-if="module">
      <h4>Resutats d'aprenentatge</h4>
      <Lr-Table :learningResults="learningResults"></Lr-Table>
    </div>
  </main>
</template>
