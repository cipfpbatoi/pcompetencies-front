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
    }
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
      this.modalData = unit
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
    }
  }
}
</script>

<template>
  <main>
    <app-breadcrumb :actualStep="4" :done="done"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }})</h2>
    <div>
      <h3>Situacions d'aprenentatge</h3>
      <show-table :data="this.syllabus.learningSituations" :columns="this.learningSituationsColumns">
        <template v-slot="{ item }">
          <button @click="showModal(item)" class="btn btn-secondary" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button @click="delUnit(item)" class="btn btn-secondary" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
        </template>
      </show-table>
      <button class="btn btn-sm btn-secondary" @click="showModal({ ponderedLearningResults: [] })">
        Afegir unitat
      </button>
      <LearnSitModal @saved="hideModal" :unit="modalData"></LearnSitModal>
    </div>
    <br />
    <div>
      <h3>Resultats d'aprenentatge</h3>
      <Lr-Table :learningResults="module.learningResults"></Lr-Table>
    </div>

  </main>
</template>
