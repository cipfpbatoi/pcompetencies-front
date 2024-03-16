<script>
import { mapState } from 'pinia'
import LrTable from '../components/LrTable.vue'
import { useDataStore } from '../stores/data'

export default {
  emits: ['save'],
  props: {
    unit: Object,
    learningResultsWU: Array,
  },
  components: {
    LrTable
  },
  computed: {
    ...mapState(useDataStore, ['learningResults']),
    editing() {
      return !!this.unit?.id
    },
    filteredLearningResults() {
      if (!this.editedUnit.learningResults) {
        return []
      }
      return this.learningResults.filter((item) =>
        this.editedUnit.learningResults.includes(item.id)
      )
    }
  },
  data() {
    return {
      editedUnit: { ...this.unit },
      learningResult: 0
    }
  },
  watch: {
    unit(newValue) {
      this.editedUnit = newValue
      this.$forceUpdate()
//      this.$nextTick(() => {});
    }
  },
  methods: {
    addRA() {
      if (this.learningResult) {
        this.editedUnit.learningResults.push(this.learningResult)
        this.learningResult = 0
      }
    },
    delRA(index) {
      this.editedUnit.learningResults.splice(index, 1)
    },
    saveWU() {
      this.learningResult = 0
      this.$emit('save', this.editedUnit)
    }
  }
}
</script>

<template>
  <!-- Modal -->
  <div
    class="modal fade"
    id="unitMmodalComp"
    tabindex="-1"
    aria-labelledby="unit-modal"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-darkgrey">
          <h1 class="modal-title fs-5" id="unit-modal">
            {{ editing ? 'Afegir' : 'Editar' }} unitat de treball
          </h1>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <form>
            <div class="row">
            <div class="input-group cols-8">
              <label class="form-label">Títol</label>
              <input
                type="text"
                class="form-control"
                v-model="editedUnit.title"
                placeholder="Títol de l'unitat"
              />
            </div>
            <div class="input-group cols-4">
              <label class="form-label">Sessions</label>
              <input
                type="number"
                class="form-control"
                v-model="editedUnit.sessions"
                placeholder="Nombre de sessions"
              />
            </div>
          </div>
            <div>
              <label class="form-label">Resultats d'aprenentatge</label>
              <lr-table :learningResults="filteredLearningResults">
                <template v-slot="{ index }">
                  <button @click="delRA(index)" 
                  class="btn btn-link" title="Eliminar">
                <i class="bi bi-trash"></i>
              </button>
                </template>
              </lr-table>
            </div>
            <div class="input-group">
              <label class="form-label">Afegir RA</label>
              <select class="form-select" v-model="learningResult" aria-label="Default select example">
                <option :value="0">-- Tria resultat d'aprenentatge --</option>
                <option
                  v-for="lr in learningResults"
                  :key="lr.id"
                  :value="lr.id"
                  :disabled="editedUnit.learningResults.includes(lr.id)"
                >
                  {{ lr.description }}
                </option>
              </select>
              <button type="button" class="btn btn-sm btn-secondary" @click="addRA">
                Afegir RA
              </button>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tanca</button>
          <button @click="saveWU" type="button" class="btn btn-secondary" data-bs-dismiss="modal">Guarda</button>
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>
