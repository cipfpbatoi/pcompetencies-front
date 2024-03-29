<script>
import { mapState } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'

export default {
  components: {
    AppBreadcrumb
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'module']),
    areAllLearningResultsInluded() {
      return this.lRincluded.size === this.module.learningResults.length
    }
  },
  mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
  },
  data() {
    return {
      lRincluded: new Set()
    }
  },
  methods: {
    includesLearningResult(ponderedLearningReslts, lRid) {
      console.log(ponderedLearningReslts)
      const isIncluded = ponderedLearningReslts.some((item) => 
      item.learningResult.id == lRid)
      if (isIncluded) {
        this.lRincluded.add(lRid)
      }
      return isIncluded
    }
  }
}
</script>

<template>
  <main>
    <app-breadcrumb :actualStep="4" :done="areAllLearningResultsInluded"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }})</h2>
    <p v-if="areAllLearningResultsInluded">
      La programació inclou tots els resultats d'aprenentatge. Pots continuar al següent pas. 
    </p>
    <template v-else>
      <h4>
      La programació NO inclou tots els resultats d'aprenentatge
      <button @click="$router.push({name: 'learningSituations'})" class="button btn-sm">Tornar</button>
    </h4>
    </template>

    <table class="table table-striped">
      <thead>
        <tr>
          <th>Unitat de treball</th>
          <!-- Encabezados de columnas para cada resultado -->
          <th v-for="result in module.learningResults" :key="result.id">
            R.A. {{ result.number }}
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- Iterar sobre cada contenido para crear una fila en la tabla -->
        <tr v-for="unit in syllabus.learningSituations" :key="unit.id">
          <td>{{ unit.title }}</td>
          <!-- Iterar sobre cada resultado para crear una celda en la fila -->
          <td v-for="result in module.learningResults" :key="result.id">
            <!-- Colocar una 'X' si el result está presente en el unit -->
            <span v-if="includesLearningResult(unit.ponderedLearningResults, result.id)">X</span>
          </td>
        </tr>
      </tbody>
    </table>
  </main>
</template>
