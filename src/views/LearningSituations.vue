<script>
import { Modal } from 'bootstrap'
import LearnSitModal from '../components/LearnSitModal.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import LrTable from '../components/LrTable.vue'
import ShowTable from '../components/ShowTable.vue'
import AppBreadcrumb from '../components/AppBreadcrumb.vue'

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
    title: 'Hores',
    value: 'hours'
  },
  {
    title: 'R.A.',
    func: (x) => {
      if (!x || !x.length) return ''
      return x
        .map(
          (item) =>
            (item.learningResultId || item.learningResult.number) + ` (${item.percentageWeight} %)`
        )
        .join(', ')
    },
    param: 'ponderedLearningResults'
  }
]

export default {
  components: {
    AppBreadcrumb,
    LrTable,
    ShowTable,
    LearnSitModal
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'module', 'getLearningResultById']),
    done() {
      return !!this.syllabus.learningSituations?.length
    },
    totalHours() {
      return this.syllabus.learningSituations.reduce((total, ls) => total + ls.hours,0)
    },
    totalRAWeight() {
      return this.syllabus.learningSituations.reduce((total, ls) => total + ls.ponderedLearningResults
      .reduce((sum,lr) => sum + lr.percentageWeight, 0) ,0)
    },
  },
  data() {
    return {
      LearnSitModal: null,
      modalData: { ponderedLearningResults: [] },
      learningSituationsColumns,
    }
  },
  mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
    this.LearnSitModal = new Modal(document.getElementById('unitMmodalComp'))
  },
  methods: {
    ...mapActions(useDataStore, ['saveLearningSituation', 'deleteLearningSituation']),
    showModal(unit) {
      if (unit) {
        this.modalData = unit
      } else {
        this.modalData = unit
      }
      this.LearnSitModal.show()
    },
    hideModal() {
      this.LearnSitModal.hide()
    },
    delUnit(unit) {
      if (
        confirm(
          'ATENCIÓ: Vas a esborrar la unitat "' +
            unit.title +
            '". Aquest procés NO es por des-fer !!!'
        )
      ) {
        this.deleteLearningSituation(unit.id)
      }
    },
    simplifyPonderedLearningResults(pLRs) {
      return pLRs.map((item) => {
        return {
          learningResultId: item.learningResult.id,
          percentageWeight: item.percentageWeight,
        }
      })
    },
    changeLSPosition(learningSituation, positionStep) {
      const learningSituationToSwap = this.syllabus.learningSituations
      .find((item) => item.position === learningSituation.position + positionStep)
      if (learningSituationToSwap) {
        this.saveLearningSituation({
          ...learningSituationToSwap,
          position: learningSituation.position,
          ponderedLearningResults: this.simplifyPonderedLearningResults(learningSituationToSwap.ponderedLearningResults)
        })
        learningSituationToSwap.position = learningSituation.position
      }
      this.saveLearningSituation({
        ...learningSituation,
        position: learningSituation.position + positionStep,
        ponderedLearningResults: this.simplifyPonderedLearningResults(learningSituation.ponderedLearningResults)
      })
      learningSituation.position = learningSituation.position + positionStep
    }
  }
}
</script>

<template>
  <main>
    <app-breadcrumb :actualStep="4" :done="done"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }}) - {{ syllabus.courseYear }}</h2>
    <div>
      <h3>Situacions d'aprenentatge</h3>
      <show-table :data="this.syllabus.learningSituations" :columns="this.learningSituationsColumns">
        <template #default="{ item }">
          <button
            @click="changeLSPosition(item, -1)"
            class="btn btn-secondary"
            title="Pujar"
            :disabled="item.position <= 1"
          >
            <i class="bi bi-arrow-up"></i>
          </button>
          <button
            :disabled="item.position >= syllabus.learningSituations.length"
            @click="changeLSPosition(item, 1)"
            class="btn btn-secondary"
            title="Baixar"
          >
            <i class="bi bi-arrow-down"></i>
          </button>
          <button @click="showModal(item)" class="btn btn-secondary" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button @click="delUnit(item)" class="btn btn-secondary" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
        </template>
        <template #footer>
          <th colspan="2">TOTAL</th>
          <th>{{ totalHours }}</th>
          <th>{{ totalRAWeight }} %</th>
        </template>
      </show-table>
      <div class="text-center">
        <button class="btn btn-success" @click="showModal()">
          Afegir Unitat
        </button>
      </div>
      <LearnSitModal @saved="hideModal" :unit="modalData"></LearnSitModal>
    </div>
    <br />
    <div class="border bg-light p-2">
      <h3>Resultats d'aprenentatge</h3>
      <Lr-Table :learningResults="module.learningResults"></Lr-Table>
    </div>

  </main>
</template>
