<script>
import { Modal } from 'bootstrap'
import UnitModal from '../components/UnitModal.vue'
import { useDataStore } from '../stores/data'
import { mapState, mapActions } from 'pinia'
export default {
  components: {
    UnitModal
  },
  props: {
    editable: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'module', 'getLearningResultById'])
  },
  data() {
    return {
      unitModal: null,
      modalData: { ponderedLearningResults: [] }
    }
  },
  async mounted() {
    this.unitModal = new Modal(document.getElementById('unitMmodalComp'))
  },
  methods: {
    ...mapActions(useDataStore, ['saveLearningSituation', 'deleteLearningSituation']),
    showModal(unit) {
      this.modalData = unit
      this.unitModal.show()
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
    showPonderedLearningResults(ponderedLR) {
      if (!ponderedLR) return ''
      return ponderedLR.map((item) => 
        (item.learningResultId || item.learningResult.number) 
        + ` (${item.percentageWeight} %)`).join(', ')
    }
  }
}
</script>

<template>
  <div>
    <h3>Unitats de treball</h3>
    <table v-if="syllabus.learningSituations?.length" class="table table-striped">
      <thead>
        <th>Num.</th>
        <th>Títol</th>
        <th>hours</th>
        <th>R.A.</th>
        <th>Accions</th>
      </thead>
      <tbody>
        <tr class="unit" v-for="unit in syllabus.learningSituations" :key="unit.id">
          <td>{{ unit.position }}</td>
          <td>{{ unit.title }}</td>
          <td>{{ unit.hours }}</td>
          <td>{{ showPonderedLearningResults(unit.ponderedLearningResults) }}</td>
          <td>
            <template v-if="editable">
              <button @click="showModal(unit)" class="btn btn-secondary" title="Editar">
                <i class="bi bi-pencil"></i>
              </button>
              <button @click="delUnit(unit)" class="btn btn-secondary" title="Eliminar">
                <i class="bi bi-trash"></i>
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>No hi ha cap unitat de treball</p>
    <button class="btn btn-sm btn-secondary" @click="showModal({ ponderedLearningResults: [] })">
      Afegir unitat
    </button>
    <UnitModal :unit="modalData"></UnitModal>
  </div>
</template>

<style scoped></style>
