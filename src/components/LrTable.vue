<script>
import ShowTable from './ShowTable.vue'

const evaluationCriteriasColumns = [
  {
    title: 'CA',
    value: 'code'
  },
  {
    title: "Criteris d'avaluació",
    value: 'description',
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
      <thead class="border-bottom border-dark p-2 bg-primary text-white">
        <th>Codi</th>
        <th>Descripció</th>
        <th v-if="percentageWeight">Pes</th>
        <th class="pe-1">Accions</th>
      </thead>
      <tbody>
        <template v-for="(result, index) in learningResults" :key="result.id">
          <tr>
            <td class="fw-bold">RA {{ result.number }}</td>
            <td class="text-start">{{ result.descriptor }}</td>
            <td v-if="percentageWeight">
              <input v-if="percentageWeight=='edit'" size="3" type="number" min="1" max="100" 
              :value="result.percentageWeight" 
              @change="changeWeight(result, $event.target.value)" />
              <span v-else>{{ result.percentageWeight }}</span> %</td>
            <td class="shadow rounded">
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
            <td class="px-3 py-1 bg-primary-subtle text-start" colspan="3">
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
