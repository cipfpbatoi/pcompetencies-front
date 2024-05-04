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
    title: 'Activitats (num.)',
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
  <main class="border shadow view-main">
    <app-breadcrumb :actualStep="6" :done="true"></app-breadcrumb>
    <div class="p-lg-4 p-1">
      <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }}) - {{ syllabus.courseYear }}</h2>
      <p>Des d'ací pots desenvolupar cada situació d'aprenentatge.</p>
      <show-table :data="syllabus.learningSituations" :columns="learningSituationsColumns">
        <template v-slot="{ item }">
          <button type="button"
                  @click="$router.push({ name: 'LSDevelopment', params: { lsId: item.id } })"
                  class="btn btn-secondary"
          >Desenvolupar</button>
        </template>
      </show-table>
    </div>
  </main>
</template>
