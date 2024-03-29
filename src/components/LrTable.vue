<script>
import EcTable from '../components/EcTable.vue'

export default {
  components: {
    EcTable
  },
  props: {
    learningResults: Array,
    percentageWeight: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      deployedRA: 0
    }
  },
  methods: {
    toogleDeployedRa(lrId) {
      this.deployedRA = this.deployedRA == lrId ? 0 : lrId
    }
  }
}
</script>

<template>
  <div>
    <table class="table table-striped">
      <thead>
        <th>RA</th>
        <th>Descrip.</th>
        <th v-if="percentageWeight">Pes</th>
        <th>Accions</th>
      </thead>
      <tbody>
        <template v-for="(result, index) in learningResults" :key="result.id">
          <tr>
            <td>{{ result.number }}</td>
            <td>{{ result.descriptor }}</td>
            <td v-if="percentageWeight">{{ result.percentageWeight }} %</td>
            <td>
              <button
                @click="toogleDeployedRa(result.id)"
                type="button"
                class="btn btn-link"
                title="Mostra els criteris d'avaluació"
              >
                <i class="bi bi-eye"></i>
              </button>
              <slot :item="result" :index="index"></slot>
            </td>
          </tr>
          <tr v-if="deployedRA == result.id">
            <td colspan="3">
              <EcTable :evaluationCriterias="result.evaluationCriterias"></EcTable>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
