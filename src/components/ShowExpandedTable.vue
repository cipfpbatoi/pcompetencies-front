<script>
import { string } from 'yup';
import ShowTable from './ShowTable.vue'

const subTableColumns = [
  {
    title: 'Codi',
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
    data: Array,
    percentageWeight: {
      type: [String],
      default: ''
    },
    checkeable: {
      type: Boolean,
      default: false
    },
    subTableInfo: {
      type: String,
      default: "els criteris d'avaluació"
    },
  },
  data() {
    return {
      deployedRow: 0,
      subTableColumns,
    }
  },
  methods: {
    toogleDeployedRa(id) {
      this.deployedRow = this.deployedRow == id ? 0 : id
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
        <template v-for="(item, index) in data" :key="item.id">
          <tr>
            <td>{{ item.code }}</td>
            <td>{{ item.descrip }}</td>
            <td v-if="percentageWeight">
              <input v-if="percentageWeight=='edit'" size="3" type="number" min="1" max="100" 
              :value="item.percentageWeight" 
              @change="changeWeight(item, $event.target.value)" />
              <span v-else>{{ item.percentageWeight }}</span> %</td>
            <td>
              <button
                @click="toogleDeployedRa(item.id)"
                type="button"
                class="btn btn-link"
                :title="'Mostra ' + subTableInfo"
              >
                <i class="bi bi-eye"></i>
              </button>
              <slot :item="item" :index="index"></slot>
            </td>
          </tr>
          <tr v-if="deployedRow == item.id">
            <td colspan="3">
              <ShowTable
                :data="item.subData"
                :columns="subTableColumns"
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
