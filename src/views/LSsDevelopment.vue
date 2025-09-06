<script>
import ShowTable from '@/components/ShowTable.vue'
import { mapState } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import LrTable from '@/components/LrTable.vue'

const learningSituationsColumns = [
{
    title: 'Num.',
    value: 'position'
  },
  {
    title: 'Títol',
    value: 'title'
  },
  {
    title: 'Objectius didàctics',
    func: (x) => x ? x.substr(0, 50) + (x.length>50 ? '...':'') : '',
    param: 'didacticObjectives',
    html: true,
  },
  {
    title: 'Hores',
    value: 'hours',
    class: 'text-center'
  },
  {
    title: 'R.A.',
    class: 'text-center',
    html: true,
    func: (x, row) => {
      if (!x || !x.length) return ''
      const raText = x.map(
          (item) =>
            (item.learningResultId || item.learningResult.number) + ` (${item.percentageWeight} %)`
        )
        .join(', ')
      if (row.inCompanyTraining) {
        return `${raText} <span class="badge bg-primary"> (Dualitzable - FE)</span> `;
      }
      return raText;
    },
    param: 'ponderedLearningResults'
  }
]

export default {
  components: {
    AppBreadcrumb,
    ShowTable,
    LrTable
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'module']),
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
    <app-breadcrumb :actualStep="5" :done="true"></app-breadcrumb>
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">{{ syllabus.module?.name }} ({{ (syllabus.turn === 'presential') ? 'Presencial' : 'Semi-presencial'  }}) - {{ syllabus.courseYear }}</div>
    <div class="p-lg-4 p-1">
      <h2>5. Desenvolupament de les Situacions d'Aprenentatge</h2>
      <p>Des d'ací pots desenvolupar cada situació d'aprenentatge.</p>
      <show-table :data="syllabus.learningSituations" :columns="learningSituationsColumns">
        <template v-slot="{ item }">
          <button type="button"
                  @click="$router.push({ name: 'LSDevelop', params: { lsId: item.id } })"
                  class="btn btn-success"
          >Desenvolupar</button>
        </template>
      </show-table>
    </div>
    <div class="border bg-light p-2">
        <h3>Resultats d'aprenentatge</h3>
        <Lr-Table class="border border-black" :learningResults="module.learningResults"></Lr-Table>
      </div>
  </main>
</template>
