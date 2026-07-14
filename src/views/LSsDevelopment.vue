<script>
import ShowTable from '@/components/ShowTable.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import LrTable from '@/components/LrTable.vue'
import { api } from '@/repositories/api'

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
    assessmentToolsSourceLabel() {
      if (this.assessmentToolsSource === 'pcc') return 'PCC'
      if (this.assessmentToolsSource === 'center') return 'centre'
      return 'no indicat'
    },
    pendingMandatoryAssessmentTools() {
      const selectedIds = this.availableAssessmentTools
        .filter((tool) => tool.selected)
        .map((tool) => tool.id)
      return this.mandatoryAssessmentTools.filter((tool) => !selectedIds.includes(tool.id))
    }
  },
  data() {
    return {
      itemToModify: '',
      learningSituationsColumns,
      assessmentToolsSource: '',
      availableAssessmentTools: [],
      mandatoryAssessmentTools: []
    }
  },
  mounted() {
    if (this.syllabus.id) {
      this.loadAssessmentToolsStatus()
    }
  },
  watch: {
    'syllabus.id'() {
      this.loadAssessmentToolsStatus()
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    async loadAssessmentToolsStatus() {
      try {
        const response = await api.getAvailableSyllabusAssessmentTools(this.syllabus.id)
        this.assessmentToolsSource = response.data?.source || ''
        this.availableAssessmentTools = response.data?.available || []
        this.mandatoryAssessmentTools =
          response.data?.mandatory || this.availableAssessmentTools.filter((tool) => tool.mandatory)
      } catch (error) {
        this.addMessage('error', error)
      }
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <app-breadcrumb :actualStep="6" :done="true"></app-breadcrumb>
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">{{ syllabus.module?.name }} ({{ (syllabus.turn === 'presential') ? 'Presencial' : 'Semi-presencial'  }}) - {{ syllabus.courseYear }}</div>
    <div class="p-lg-4 p-1">
      <h2>6. Desenvolupament de les Situacions d'Aprenentatge</h2>
      <p>Des d'ací pots desenvolupar cada situació d'aprenentatge.</p>
      <div v-if="pendingMandatoryAssessmentTools.length" class="alert alert-warning" role="alert">
        <strong>Falten instruments d'avaluació obligatoris per utilitzar.</strong>
        <div>
          Cada instrument obligatori ha d'aparéixer almenys en una activitat qualificable d'alguna
          S.A.
        </div>
        <div class="mt-2">
          <span>Obligatoris pendents segons {{ assessmentToolsSourceLabel }}:</span>
          <ul class="mb-0">
            <li v-for="tool in pendingMandatoryAssessmentTools" :key="tool.id">
              {{ tool.name }}
            </li>
          </ul>
        </div>
      </div>
      <div v-else class="alert alert-success" role="alert">
        Tots els instruments d'avaluació obligatoris estan utilitzats en activitats qualificables.
      </div>
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
