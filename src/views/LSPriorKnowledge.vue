<script>
import { Modal } from 'bootstrap'
import PriorKnowledgeModal from '../components/PriorKnowledgeModal.vue'
import ShowTable from '@/components/ShowTable.vue'
import { mapState } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '../components/AppBreadcrumb.vue'
import {api} from '../repositories/api'

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
    title: 'Coneix. previs',
    value: 'priorKnowledge'
  }
]

export default {
  components: {
    AppBreadcrumb,
    ShowTable,
    PriorKnowledgeModal
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'cycle']),
    done() {
      return !!this.syllabus.learningSituations?.length
    }
  },
  data() {
    return {
      PriorKnowledgeModal: null,
      modalData: {},
      learningSituationsColumns,
    }
  },
  mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
    this.PriorKnowledgeModal = new Modal(document.getElementById('unitMmodalComp'))
  },
  methods: {
    async showModal(unit) {
      const response = await api.getLearningSituationById(unit.id)
      this.modalData = response.data
      this.PriorKnowledgeModal.show()
    },
    hideModal() {
      this.PriorKnowledgeModal.hide()
    },
  }
}
</script>

<template>
  <main>
    <app-breadcrumb :actualStep="7" :done="done"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }})</h2>
    <div>
      <h3>Coneixements previs</h3>
      <show-table :data="syllabus.learningSituations" :columns="learningSituationsColumns">
        <template v-slot="{ item }">
          <button @click="showModal(item)" class="btn btn-secondary" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
        </template>
      </show-table>
      <PriorKnowledgeModal @saved="hideModal" :unit="modalData"></PriorKnowledgeModal>
    </div>
  </main>
</template>
