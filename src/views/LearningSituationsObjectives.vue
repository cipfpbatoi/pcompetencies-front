<script>
import { Modal } from 'bootstrap'
import ObjectivesModal from '../components/ObjectivesModal.vue'
import ShowTable from '@/components/ShowTable.vue'
import { mapState } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '../components/AppBreadcrumb.vue'
import {api} from '../repositories/api'

const generaObjectivesColumns = [
  {
    title: 'Codi',
    value: 'code'
  },
  {
    title: 'Descripció',
    value: 'description'
  },
]

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
    title: 'Obj. generals',
    func: (x) => {
      if (!x || !x.length) return ''
      return x
        .map((item) => item.code)
        .join(', ')
    },
    param: 'generalObjectives'  },
  {
    title: 'Obj. didàctics',
    value: 'didacticObjectives'
  }
]

export default {
  components: {
    AppBreadcrumb,
    ShowTable,
    ObjectivesModal
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'cycle']),
    done() {
      return !!this.syllabus.learningSituations?.length
    }
  },
  data() {
    return {
      ObjectivesModal: null,
      modalData: { ponderedLearningResults: [] },
      learningSituationsColumns,
      generaObjectivesColumns,
    }
  },
  mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
    this.ObjectivesModal = new Modal(document.getElementById('unitMmodalComp'))
  },
  methods: {
    async showModal(unit) {
      const response = await api.getLearningSituationById(unit.id)
      this.modalData = response.data
      this.ObjectivesModal.show()
    },
    hideModal() {
      this.ObjectivesModal.hide()
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
    <app-breadcrumb :actualStep="6" :done="done"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }})</h2>
    <div>
      <h3>Establir els objectius de cada Situació d'aprenentatge</h3>
      <show-table :data="syllabus.learningSituations" :columns="learningSituationsColumns">
        <template v-slot="{ item }">
          <button @click="showModal(item)" class="btn btn-secondary" title="Establir objectiu">
            <i class="bi bi-bullseye"></i>
          </button>
        </template>
      </show-table>
      <ObjectivesModal @saved="hideModal" :unit="modalData"></ObjectivesModal>
    </div>
    <br />
    <div>
      <h3>Objectius generals</h3>
      <show-table :data="cycle.generalObjectives" :columns="generaObjectivesColumns">
        </show-table>
    </div>
    <br />
  </main>
</template>
