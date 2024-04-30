<script>
import ShowTable from './ShowTable.vue'

const evaluationCriteriasColumns = [
  {
    title: 'CA',
    value: 'code'
  },
  {
    title: 'Descripció',
    value: 'description'
  }
]

export default {
  emits: ['changeWeigth'],
  components: {
    ShowTable
  },
  props: {
    learningResults: Array,
    percentageWeight: {
      type: [String],
      default: ''
    },
    checkeable: {
      type: Boolean,
      default: false
    },
  },
  data() {
    return {
      deployedRA: 0,
      evaluationCriteriasColumns,
    }
  },
  methods: {
    toogleDeployedRa(lrId) {
      this.deployedRA = this.deployedRA == lrId ? 0 : lrId
    },
    changeWeight(result, newWeight) {
      result.percentageWeight = Number(newWeight)
      this.$emit('changeWeigth', result)
    }
  }
}
</script>

<template>
  <div>
    <table class="table table-striped text-center">
      <thead>
        <th>Codi</th>
        <th>Descripció</th>
        <th v-if="percentageWeight">Pes</th>
        <th>Accions</th>
      </thead>
      <tbody>
        <template v-for="(result, index) in learningResults" :key="result.id">
          <tr>
            <td>RA {{ result.number }}</td>
            <td>{{ result.descriptor }}</td>
            <td v-if="percentageWeight">
              <input v-if="percentageWeight=='edit'" size="3" type="number" min="1" max="100" 
              :value="result.percentageWeight" 
              @change="changeWeight(result, $event.target.value)" />
              <span v-else>{{ result.percentageWeight }}</span> %</td>
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
              <ShowTable
                :data="result.evaluationCriterias"
                :columns="evaluationCriteriasColumns"
                :actions="false"
                :checkeable="checkeable"
              ></ShowTable>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
