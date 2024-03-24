<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'

export default {
  computed: {
    ...mapState(useDataStore, ['cicles', 'modules']),
  },
  data() {
    return {
      cicle: '',
      module: '',
      programmings: [],
      done: false,
    }
  },
  methods: {
    ...mapActions(useDataStore, ['loadModules', 'getProgrammings', 'setProgramming', 'addProgramming']),
    getModules() {
      if (this.cicle) {
        this.loadModules(this.cicle)
      }
      this.module = ''
      this.done = false
    },
    async getProg() {
      this.programmings = await this.getProgrammings(this.cicle, this.module)
    },
    async createProg(turn) {
      await this.addProgramming(this.cicle, this.module, turn)
      this.$router.push('/impr-prop')
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
          {{ cicle.completeName }}
        </option>
      </select>
    </div>
    <div v-if="cicle">
      <label>Mòdul</label>
      <select v-model="module" @change="getProg" class="form-select" aria-label="Default select example">
        <option value="">-- Selecciona mòdul --</option>
        <option v-for="module in modules" :key="module.code" :value="module.code">
          {{ module.name }}
        </option>
      </select>
    </div>
    <br>
    <div v-if="module">
      <h3>Programació</h3>
      <ul v-if="programmings.length">
        <li v-for="prog in programmings" :key="prog.id">
        {{prog.module.name}} ({{ prog.cycle.shortName }}) {{ prog.turn }}
        <RouterLink @click="setProgramming(prog)" to="/impr-prop">Editar</RouterLink>
      </li>
          </ul>
      <p v-else>No hi ha programació d'aquest mòdul. 
        <button @click="createProg('presential')" type="button btn-sm">Crear nova programació presencial</button>
        <button @click="createProg('half-presential')" type="button btn-sm">Crear nova programació presencial</button>
      </p>
    </div>
  </main>
</template>
