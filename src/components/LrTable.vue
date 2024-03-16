<script>
import EcTable from '../components/EcTable.vue'

export default {
  components: {
    EcTable
  },
  props: {
    learningResults: Array
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
        <th>Accions</th>
      </thead>
      <tbody>
        <template v-for="(result, index) in learningResults" :key="result.id">
          <tr>
            <td>{{ result.number }}</td>
            <td>{{ result.description }}</td>
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
              <EcTable :learningResultId="result.id"></EcTable>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
