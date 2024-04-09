<script>
import ShowTable from '@/components/ShowTable.vue'
import { mapState } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'

const learningSituationsColumns = [
  {
    title: 'Títol',
    value: 'title'
  },
  {
    title: 'Objectius',
    func: (x) => x ? x.substr(0, 6) + '...' : '',
    param: 'didacticObjectives'
  },
  {
    title: 'Coneix. previs',
    func: (x) => x ? x.substr(0, 6) + '...' : '',
    param: 'priorKnowledge'
  },
  {
    title: 'Continguts (num.)',
    func: (x) => x ? x.length : 0,
    param: 'didacticContents'
  },
  {
    title: 'Coneix. previs',
    value: 'priorKnowledge'
  },
]

export default {
  components: {
    AppBreadcrumb,
    ShowTable
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'module']),
  },
  mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
  },
  data() {
    return {
      itemToModify: '',
      learningSituationsColumns
    }
  },
  methods: {}
}
</script>

<template>
  <main>
    <app-breadcrumb :actualStep="6" :done="false"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }})</h2>
    <p>Des d'ací pots desenvolupar cada situació d'aprenentatge.</p>
    <show-table :data="syllabus.learningSituations" :columns="learningSituationsColumns">
      <template v-slot="{ item }">
        <button type="button"
          @click="$router.push({ name: 'LSDevelopment', params: { lsId: item.id } })"
          class="btn btn-secondary"
        >Desenvolupar</button>
      </template>
    </show-table>
    <table class="table table-striped">
      <thead>
        <tr>
          <th>Unitat de treball</th>
          <th>Objectius</th>
          <th>Coneix. previs</th>
          <th>Total de continguts</th>
          <th>Total de activ. qualificables</th>
          <th>Total de activ. NO qualificables</th>
          <th>Total de activ. de reforç/ampliació</th>
        </tr>
      </thead>
      <tbody>
        <!-- Iterar sobre cada contenido para crear una fila en la tabla -->
        <tr v-for="unit in syllabus.learningSituations" :key="unit.id">
          <td>
            {{ unit.title }}
          </td>
          <td>{{ unit.didacticObjectives?.substr(0, 10) }}...</td>
          <td>
            <button class="btn btn-link">
              {{ unit.priorKnowledge?.substr(0, 10) }}...
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </main>
</template>
