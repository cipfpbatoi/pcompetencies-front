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
      return this.lRincluded.size === this.module.learningResults?.length
    },
    totalSum() {
      return this.syllabus.learningSituations?.reduce(
        (total, lS) =>
          total +
          lS.ponderedLearningResults?.reduce((total, lR) =>
            total + lR.percentageWeight
          , 0),
        0
      ) || 0
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
      const isIncluded = ponderedLearningReslts?.some((item) => item.learningResult.id == lRid)
      if (isIncluded) {
        this.lRincluded.add(lRid)
      }
      return isIncluded
    },
    ponderedSumOfRA(ra) {
      return this.syllabus.learningSituations?.reduce(
        (total, lS) =>
          total +
          lS.ponderedLearningResults.reduce((total, lR) =>
            lR.learningResult.id === ra.id ? total + lR.percentageWeight : total
          , 0),
        0
      ) || 0
    },
    sumOfLS(ls) {
      return (
        ls.ponderedLearningResults?.reduce((total, item) => total + item.percentageWeight, 0) || 0
      )
    },
  }
}
</script>

<template>
  <main>
    <app-breadcrumb :actualStep="5" :done="areAllLearningResultsInluded"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }}) - {{ syllabus.courseYear }}</h2>
    <div class="bg-success m-1">
      <p class="text-light p-2 text-justify" v-if="areAllLearningResultsInluded">
        <strong>OK!</strong> La programació inclou tots els resultats d'aprenentatge. Pots continuar al següent pas.
      </p>
      <template v-else>
        <h4>
          <span class="text-danger">La programació NO inclou tots els resultats d' aprenentatge</span>
          <button @click="$router.push({ name: 'learningSituations' })" class="button btn-sm">Tornar</button>
        </h4>
      </template>
    </div>
    <div class="bg-danger m-1">
      <p v-if="totalSum !== 100" class="text-light p-2 text-justify"><strong>ATENCIÓ:</strong> la suma dels percentatges NO és el 100%. Has d'arreglar-lo</p>
    </div>
    <table class="table table-striped">
      <thead>
        <tr>
          <th>Situació d'aprenentatge</th>
          <!-- Encabezados de columnas para cada resultado -->
          <th v-for="result in module.learningResults" :key="result.id">
            R.A. {{ result.number }}
          </th>
          <th>Pes</th>
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
          <th>{{ sumOfLS(unit) }}%</th>
        </tr>
        <tr>
          <td><strong>Pes de cada R.A.</strong></td>
          <td v-for="result in module.learningResults" :key="result.id">
            <!-- Colocar una 'X' si el result está presente en el unit -->
            <span>{{ ponderedSumOfRA(result) }}%</span>
          </td>
          <th>{{ totalSum }}%</th>
        </tr>
      </tbody>
    </table>
  </main>
</template>
