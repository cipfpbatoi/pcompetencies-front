<script>
import { mapState } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import LrTable from '@/components/LrTable.vue'

export default {
  components: {
    AppBreadcrumb,
    LrTable,
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'module']),
    areAllLearningResultsInluded() {
      return this.lRincluded.size === this.module.learningResults?.length
    },
    totalSum() {
      return (
        this.syllabus.learningSituations?.reduce(
          (total, lS) =>
            total +
            lS.ponderedLearningResults?.reduce((total, lR) => total + lR.percentageWeight, 0),
          0
        ) || 0
      )
    },
    totalHours() {
      return this.syllabus.learningSituations?.reduce((total, ls) => total + ls.hours, 0)
    },
    totalHoursUsed() {
      return this.totalHours == this.syllabus.numberOfHours
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
    getPercentage(ponderedLearningReslts, lrId) {
      const percentage = ponderedLearningReslts.find((item) => item.learningResult.id == lrId)
      if (percentage) {
        this.lRincluded.add(lrId)
      }
      return percentage ? percentage.percentageWeight + '%' : ''
    },
    includesLearningResult(ponderedLearningReslts, lRid) {
      const isIncluded = ponderedLearningReslts?.some((item) => item.learningResult.id == lRid)
      if (isIncluded) {
        this.lRincluded.add(lRid)
      }
      return isIncluded
    },
    ponderedSumOfRA(ra) {
      return (
        this.syllabus.learningSituations?.reduce(
          (total, lS) =>
            total +
            lS.ponderedLearningResults.reduce(
              (total, lR) => (lR.learningResult.id === ra.id ? total + lR.percentageWeight : total),
              0
            ),
          0
        ) || 0
      )
    },
    sumOfLS(ls) {
      return (
        ls.ponderedLearningResults?.reduce((total, item) => total + item.percentageWeight, 0) || 0
      )
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <app-breadcrumb :actualStep="4" :done="areAllLearningResultsInluded"></app-breadcrumb>
    <div class="p-lg-4 p-1">
      <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }}) - {{ syllabus.courseYear }}</h2>
      <h2>4. Comprovació dels R.A.</h2>
      <div class="bg-success m-1">
        <p class="text-light p-2 text-justify" v-if="areAllLearningResultsInluded">
          <strong>OK!</strong> La programació inclou tots els resultats d'aprenentatge. Pots continuar
          al següent pas.
        </p>
        <template v-else>
          <h4>
            <span class="text-light p-2 text-justify">La programació NO inclou tots els resultats d' aprenentatge</span>
          </h4>
        </template>
      </div>
      <div class="bg-danger m-1">
        <p v-if="totalSum !== 100" class="text-light p-2 text-justify">
          <strong>ATENCIÓ:</strong> la suma dels percentatges NO és el 100%. Has d'arreglar-lo en el
          pas anterior
        </p>
        <p v-if="!totalHoursUsed" class="text-light p-2 text-justify">
          <strong>ATENCIÓ:</strong> la suma de les hores NO suma les totals del mòdul ({{
            syllabus.numberOfHours
          }}). Has d'arreglar-lo en el pas anterior
        </p>
      </div>
      <div class="border border-black overflow-auto">
        <table class="table table-striped">
          <thead>
          <tr>
            <th>Situació d'aprenentatge</th>
            <th>Hores</th>
            <!-- Encabezados de columnas para cada resultado -->
            <th v-for="result in module.learningResults" :key="result.id" :title="result.descriptor">
              R.A. {{ result.number }}
            </th>
            <th>Pes</th>
          </tr>
          </thead>
          <tbody>
          <!-- Iterar sobre cada contenido para crear una fila en la tabla -->
          <tr v-for="(ls, indexLS) in syllabus.learningSituations" :key="ls.id">
            <td>{{ ls.position }} - {{ ls.title }}</td>
            <td>{{ ls.hours }}</td>
            <!-- Iterar sobre cada resultado para crear una celda en la fila -->
            <td v-for="(result) in module.learningResults" :key="result.id">
              <!-- Colocar una 'X' si el result está presente en el ls -->
              <span class="fw-bold" v-if="includesLearningResult(ls.ponderedLearningResults, result.id)">
                X<span class="fw-light text-muted">({{ getPercentage(syllabus.learningSituations[indexLS].ponderedLearningResults, result.id) }})</span>
              </span>
            </td>
            <th>{{ sumOfLS(ls) }}%</th>
          </tr>
          <tr>
            <td><strong>Pes de cada R.A.</strong></td>
            <td><strong>{{ totalHours }}</strong></td>
            <td v-for="result in module.learningResults" :key="result.id">
              <!-- Colocar una 'X' si el result está presente en el ls -->
              <span>{{ ponderedSumOfRA(result) }}%</span>
            </td>
            <th>{{ totalSum }}%</th>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="border bg-light p-2">
        <h3>Resultats d'aprenentatge</h3>
        <Lr-Table class="border border-black" :learningResults="module.learningResults"></Lr-Table>
      </div>
  </main>
</template>
