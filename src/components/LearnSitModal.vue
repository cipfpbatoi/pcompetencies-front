<script>
import { mapState, mapActions } from 'pinia'
import LrTable from '../components/LrTable.vue'
import { useDataStore } from '../stores/data'
import * as yup from 'yup'
import { object } from 'yup'

const validationSchema = object({
  title: yup
    .string()
    .trim()
    .required('Has de posar el títol')
    .min(5, 'Ha de tenir 5 caracters o més'),
  hours: yup.number().required("Has d'indicar les hores").min(1, "Al menys l'has de dedicar 1 hora")
})

export default {
  emits: ['saved'],
  props: {
    unit: Object
  },
  components: {
    LrTable
  },
  computed: {
    ...mapState(useDataStore, ['module', 'getLearningResultById']),
    editing() {
      return !!this.unit?.id
    },
    formattedLearningResults() {
      return this.editedUnit.ponderedLearningResults.map((item) => {
        const lRid = item.learningResultId || item.learningResult.id
        const lR = this.getLearningResultById(lRid)
        return {
          id: item.id,
          percentageWeight: item.percentageWeight,
          number: lR.number,
          descriptor: lR.descriptor,
          evaluationCriterias: lR.evaluationCriterias
        }
      })
    },
    addedLearningResultsIds() {
      return this.editedUnit.ponderedLearningResults.map(
        (item) => item.learningResultId || item.learningResult.id
      )
    }
  },
  data() {
    return {
      editedUnit: { ponderedLearningResults: [] }, // { ...this.unit },
      newLearningResult: {},
      errors: []
    }
  },
  watch: {
    unit(newValue) {
      this.editedUnit = JSON.parse(JSON.stringify(newValue))
      this.simplifyPLR(newValue)
      this.$forceUpdate()
      //      this.$nextTick(() => {});
    }
  },
  methods: {
    ...mapActions(useDataStore, ['saveLearningSituation']),
    addRA() {
      this.editedUnit.ponderedLearningResults.push(this.newLearningResult)
      this.newLearningResult = {}
    },
    delRA(index) {
      this.editedUnit.ponderedLearningResults.splice(index, 1)
    },
    simplifyPLR() {
      this.editedUnit.ponderedLearningResults = this.editedUnit.ponderedLearningResults.map(
        (item) => {
          if (item.learningResultId) {
            return item
          }
          return {
            id: item.id,
            percentageWeight: item.percentageWeight,
            learningResultId: item.learningResult.id
          }
        }
      )
    },
    async saveLS() {
      this.newLearningResult = {}
      try {
        // Valida los datos del formulario con Yup
        await validationSchema.validate(this.editedUnit, { abortEarly: false })
      } catch (error) {
        // Maneja los errores de validación y actualiza el estado de los errores
        const formattedErrors = {}
        if (error.inner) {
          error.inner.forEach((validationError) => {
            formattedErrors[validationError.path] = validationError.message
          })
          this.errors = formattedErrors
        }
        return
      }
      if (
        await this.saveLearningSituation({
          id: this.editedUnit.id,
          title: this.editedUnit.title,
          hours: this.editedUnit.hours,
          position: this.editedUnit.position,
          ponderedLearningResults: this.editedUnit.ponderedLearningResults
        })
      ) {
        this.editedUnit = { ponderedLearningResults: [] }
        this.$emit('saved')
      }
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
            {{ editing ? 'Editar' : 'Afegir' }} unitat de treball
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
                  autofocus
                />
                <span v-if="errors.title" class="error">{{ errors.title }}</span>
              </div>
              <div class="input-group cols-4">
                <label class="form-label">Hores</label>
                <input
                  size="2"
                  type="number"
                  class="form-control"
                  v-model="editedUnit.hours"
                  placeholder="Nombre d'hores"
                />
                <span v-if="errors.hours" class="error">{{ errors.hours }}</span>
              </div>
            </div>
            <div>
              <label class="form-label">Resultats d'aprenentatge</label>
              <lr-table :learningResults="formattedLearningResults" :percentageWeight="true">
                <template v-slot="{ index }">
                  <button @click="delRA(index)" class="btn btn-link" title="Eliminar">
                    <i class="bi bi-trash"></i>
                  </button>
                </template>
              </lr-table>
            </div>
            <div class="input-group">
              <label class="form-label">Afegir RA</label>
              <select
                class="form-select"
                v-model="newLearningResult.learningResultId"
                aria-label="Default select example"
              >
                <option :value="0">-- Tria resultat d'aprenentatge --</option>
                <option
                  v-for="lr in module.learningResults"
                  :key="lr.id"
                  :value="lr.id"
                  :disabled="addedLearningResultsIds.includes(lr.id)"
                >
                  {{ lr.descriptor }}
                </option>
              </select>
              <label class="form-label">Pes: </label>
              <input
                size="3"
                type="number"
                v-model="newLearningResult.percentageWeight"
                min="1"
                max="100"
              />%
              <button
                type="button"
                class="btn btn-sm btn-secondary"
                @click="addRA"
                :disabled="
                  !(newLearningResult.learningResultId && newLearningResult.percentageWeight)
                "
              >
                Afegir RA
              </button>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tanca</button>
          <button @click="saveLS" type="button" class="btn btn-secondary">Guarda</button>
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error {
  color: red;
}
</style>
