<script>
import { mapState, mapActions } from 'pinia'
import LrTable from '../components/LrTable.vue'
import { useDataStore } from '../stores/data'
import * as yup from 'yup'
import { object } from 'yup'
import { validateFormErrors } from '../utils/utils.js'

const validationSchema = object({
  title: yup
    .string()
    .trim()
    .required('Has de posar el títol')
    .min(5, 'Ha de tenir 5 caracters o més'),
  hours: yup
    .number()
    .required("Has d'indicar les hores")
    .min(1, "Al menys l'has de dedicar 1 hora"),
  ponderedLearningResults: yup.array().min(1, 'Has de afegir al menys 1 RA')
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
      return (
        this.editedUnit.ponderedLearningResults?.map((item) => {
          const lRid = item.learningResultId || item.learningResult.id
          const lR = this.getLearningResultById(lRid)
          return {
            id: item.id,
            percentageWeight: item.percentageWeight,
            number: lR.number,
            descriptor: lR.descriptor,
            evaluationCriterias: lR.evaluationCriterias
          }
        }) || []
      )
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
      errors: {},
    }
  },
  watch: {
    unit(newValue) {
      if (newValue) {
        this.editedUnit = JSON.parse(JSON.stringify(newValue))
        this.simplifyPLR(newValue)
      } else {
        this.editedUnit = { ponderedLearningResults: [] }
      }
      this.$forceUpdate()
      //      this.$nextTick(() => {});
    }
  },
  methods: {
    ...mapActions(useDataStore, ['saveLearningSituation']),
    addRA() {
      if (this.newLearningResult.percentageWeight < 0 || this.newLearningResult.percentageWeight > 100) {
          this.errors.percentageWeight = 'El pes de cada RA no pot ser menor que 0 ni major que el 100%'
          return
      }
      if (!Number.isInteger(this.newLearningResult.percentageWeight)){
           this.errors.percentageWeight = 'El pes de cada RA ha de ser un valor enter'
           return
      }
      this.editedUnit.ponderedLearningResults.push(this.newLearningResult)
      this.newLearningResult = {}
    },
    delRA(index) {
        this.editedUnit.ponderedLearningResults.splice(index, 1)
    },
    changeRAWeight(ra) {
      const result = this.editedUnit.ponderedLearningResults.find(item => item.id === ra.id)
      result.percentageWeight = ra.percentageWeight
    },
    simplifyPLR() {
      this.editedUnit.ponderedLearningResults =
        this.editedUnit.ponderedLearningResults?.map((item) => {
          if (item.learningResultId) {
            return item
          }
          return {
            id: item.id,
            percentageWeight: item.percentageWeight,
            learningResultId: item.learningResult.id
          }
        }) || []
    },
    async saveLS() {
      this.newLearningResult = {}
      this.errors = await validateFormErrors(validationSchema, this.editedUnit)
      if (Object.keys(this.errors).length) return

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
          <h1 class="modal-title fs-5" id="unit-modal">{{ editing ? 'Editar' : 'Afegir' }} Situació d'Aprenentatge</h1>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <form>
            <div class="row p-2">
              <div class="input-group cols-8 p-2">
                <label class="form-label p-2 fw-bold col-sm-2 col-lg-1">Títol</label>
                <input
                  type="text"
                  class="form-control p-2"
                  v-model="editedUnit.title"
                  placeholder="Títol de l'unitat"
                  autofocus
                />
                <p v-if="errors.title" class="error p-2">{{ errors.title }}</p>
              </div>
              <div class="input-group cols-8 p-2">
                <label class="form-label p-2 fw-bold col-sm-2 col-lg-1">Hores</label>
                <input
                  size="2"
                  type="number"
                  class="form-control p-2 col-4"
                  v-model="editedUnit.hours"
                  placeholder="Nombre d'hores"
                />
                <p v-if="errors.hours" class="error text-danger">{{ errors.hours }}</p>
              </div>
            </div>
            <div>
              <label class="form-label p-2 fw-bold">Resultats d'Aprenentatge</label>
              <lr-table :learningResults="formattedLearningResults" percentageWeight="edit" @changeWeigth="changeRAWeight">
                <template v-slot="{ index }">
                  <button @click="delRA(index)" class="btn btn-link" title="Eliminar">
                    <i class="bi bi-trash"></i>
                  </button>
                </template>
              </lr-table>
              <p v-if="errors.ponderedLearningResults" class="error">{{ errors.ponderedLearningResults }}
              </p>
            </div>
            <div class="input-group">
              <label class="form-label p-2 fw-bold">Afegir RA</label>
              <select
                class="form-select"
                v-model="newLearningResult.learningResultId"
                aria-label="Default select example"
              >
                <option :value="0">-- Tria resultat d'aprenentatge --</option>
                <option
                  class="p-2"
                  v-for="lr in module.learningResults"
                  :key="lr.id"
                  :value="lr.id"
                  :disabled="addedLearningResultsIds.includes(lr.id)"
                >
                  RA{{ lr.number }} {{ lr.descriptor }}
                </option>
              </select>
              <label class="form-label p-2">Pes: </label>
              <input
                step="1"
                class="p-2"
                size="3"
                type="number"
                v-model="newLearningResult.percentageWeight"
                min="1"
                max="100"
              />
              <span class="p-2">%</span>
              <button
                type="button"
                class="btn btn-sm btn-primary p-2"
                @click="addRA"
                :disabled="
                  !(newLearningResult.learningResultId && newLearningResult.percentageWeight)
                "
              >
                Afegir RA
              </button>
            </div>
            <p v-if="errors.percentageWeight" class="error text-center">{{ errors.percentageWeight }}</p>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-danger" data-bs-dismiss="modal">Tanca</button>
          <button @click="saveLS" type="button" class="btn btn-success">Guarda</button>
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
