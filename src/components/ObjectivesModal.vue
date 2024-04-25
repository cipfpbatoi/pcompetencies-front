<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import * as yup from 'yup'
import { object } from 'yup'
import ShowTable from './ShowTable.vue'

const generalObjectivesColumns = [
{
    title: 'Codi',
    value: 'code'
  },
  {
    title: 'Descripció',
    value: 'description'
  }
]

const validationSchema = object({
  didacticObjectives: yup
    .string()
    .trim()
    .required('Has de posar els objectius')
    .min(20, 'Al menys han de tindre 20 caracters')
})

export default {
  emits: ['saved'],
  components: {
    ShowTable,
  },
  props: {
    unit: Object
  },
  mounted() {
    this.didacticObjectives = this.unit?.didacticObjectives || ''
  },
  computed: {
    ...mapState(useDataStore, ['syllabus']),
    generalObjectives() {
      return this.syllabus.moduleCycleObjectives?.map((item) => {
        return {
          ...item,
          checked: this.unitGeneralObjectivesIds?.includes(item.id) || false
        }
      }) || []
    },
    unitGeneralObjectivesIds() {
      return this.unit.generalObjectives?.map((item) => item.id)
    }
  },
  data() {
    return {
      didacticObjectives: this.unit?.didacticObjectives || 'sdf',
      errors: [],
      generalObjectivesColumns,
    }
  },
  methods: {
    ...mapActions(useDataStore, ['saveLearningSituationObjectives']),
    async save() {
      try {
        // Valida los datos del formulario con Yup
        await validationSchema.validate(
          { didacticObjectives: this.didacticObjectives },
          { abortEarly: false }
        )
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
      const response = await this.saveLearningSituationObjectives(this.unit.id, {
        didacticObjectives: this.didacticObjectives,
        generalObjectivesIds: this.generalObjectives
          .filter((item) => item.checked)
          .map((item) => item.id)
      })
      if (response === 'ok') {
        this.$emit('saved')
      } else {
        if (response.response?.status == 422) {
          const serverError = response.response.data.detail.split(': ')
          this.errors[serverError[0]] = serverError[1]
          return
        }
      }
    }
  }
}
</script>

<template>
  <!-- Modal -->
  <div
    class="modal fade"
    id="objectivesModalComp"
    tabindex="-1"
    aria-labelledby="unit-modal"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-darkgrey">
          <h1 class="modal-title fs-5" id="unit-modal">{{ unit.position }}: {{ unit.title }}</h1>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <div class="row">
            <div class="cols-6">
              <label class="form-label">Objectius generals</label>
              <!-- Tabla de objetivos generales-->
              <div>
                <ShowTable :checkeable="true" :actions="false" :data="generalObjectives" :columns="generalObjectivesColumns">
                </ShowTable>
              </div>
              <!-- Fin tabla -->
            </div>
            <div class="cols-6">
              <label class="form-label">Objectius didàctics</label>
              <textarea class="form-control" v-model="didacticObjectives"></textarea>
              <span v-if="errors.didacticObjectives" class="error">{{
                errors.didacticObjectives
              }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tanca</button>
          <button @click="save" type="button" class="btn btn-secondary">Guarda</button>
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
