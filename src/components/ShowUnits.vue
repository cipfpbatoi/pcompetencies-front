<script>
import { Modal } from 'bootstrap'
import UnitModal from '../components/UnitModal.vue'
import { useDataStore } from '../stores/data'
import { mapState, mapActions } from 'pinia'
export default {
  components: {
    UnitModal,
  },
  props: {
    units: Array,
    editable: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState(useDataStore, ['programming', 'workUnits'])
  },
  data() {
    return {
      unitModal: null,
      modalData: { learningResults: [] }
    }
  },
  async mounted() {
    this.unitModal = new Modal(document.getElementById('unitMmodalComp'))
  },
  methods: {
    ...mapActions(useDataStore, ['saveWorkUnit', 'delWorkUnit']),
    showModal(unit) {
      this.modalData = unit
      this.unitModal.show()
    },
    saveUnit(unit) {
      unit.programming_id = this.programming.id
      this.saveWorkUnit(unit)
    },
    delUnit(unit) {
      if (
        confirm(
          'ATENCIÓ: Vas a esborrar la unitat "' +
            unit.title +
            '". Aquest procés NO es por des-fer !!!'
        )
      ) {
        this.delWorkUnit(unit.id)
      }
    },
  }
}
</script>

<template>
  <div>
    <h3>Unitats de treball</h3>
    <table v-if="workUnits.length" class="table table-striped">
      <thead>
        <th>Num.</th>
        <th>Títol</th>
        <th>Sessions</th>
        <th>R.A.</th>
        <th>Accions</th>
      </thead>
      <tbody>
        <tr class="unit" v-for="unit in units" :key="unit.id">
          <td>{{ unit.order }}</td>
          <td>{{ unit.title }}</td>
          <td>{{ unit.sessions }}</td>
          <td>{{ unit.learningResults.join(', ') }}</td>
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
    <button class="btn btn-sm btn-secondary" @click="showModal({learningResults: []})">Afegir unitat</button>
    <UnitModal @save="saveUnit" :unit="modalData"></UnitModal>
  </div>
</template>

<style scoped></style>
