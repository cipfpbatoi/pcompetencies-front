<script>
import { mapState } from 'pinia'
import { useDataStore } from '../stores/data'

export default {
  computed: {
    ...mapState(useDataStore, ['programming', 'currentModule', 'workUnits', 'learningResults']),
  },
  mounted() {
    if (!this.programming.id) {
      this.$router.push('/')
    }
  },
  data() {
    return {
      done: false,
    }
  },
  methods: {
  }
}
</script>

<template>
  <main>
    <div class="bg-secondary text-white">
      <button @click="$router.push('/')" class="btn btn-sm btn-link">Pas 1: selecciona mòdul</button> -> 
      <button @click="$router.push('/work-units')" class="btn btn-sm btn-link">Pas 2: unitats de treball</button> ->
      Pas 3: Test RA -> 
      <button @click="$router.push('/test')" :disabled="!done">Següent pas</button>
    </div>
    <h2>{{ currentModule.name }}</h2>
    <table class="table table-striped">
  <thead>
    <tr>
      <th>Unitat de treball</th>
      <!-- Encabezados de columnas para cada resultado -->
      <th v-for="result in learningResults" :key="result.id">R.A. {{ result.number }}</th>
    </tr>
  </thead>
  <tbody>
    <!-- Iterar sobre cada contenido para crear una fila en la tabla -->
    <tr v-for="unit in workUnits" :key="unit.id">
      <td>{{ unit.title }}</td>
      <!-- Iterar sobre cada resultado para crear una celda en la fila -->
      <td v-for="result in learningResults" :key="result.id">
        <!-- Colocar una 'X' si el result está presente en el unit -->
        <span v-if="unit.learningResults.includes(result.id)">X</span>
      </td>
    </tr>
  </tbody>
</table>

  </main>
</template>