<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import * as yup from 'yup'
import { object } from 'yup'

const validationSchema = object({
  didacticObjectives: yup
    .string()
    .trim()
    .required('Has de posar els objectius')
    .min(20, 'Al menys han de tindre 20 caracters')
})

export default {
  emits: ['saved'],
  props: {
    unit: Object
  },
  computed: {
    ...mapState(useDataStore, ['cycle']),
    unitGeneralObjectivesIds() {
      return this.unit.generalObjectives.map((item) => item.id)
    }
  },
  data() {
    return {
      didacticObjectives: '',
      generalObjectives: [],
      errors: []
    }
  },
  watch: {
    unit(newValue) {
      this.didacticObjectives = newValue.didacticObjectives
      ;(this.generalObjectives = this.cycle.generalObjectives.map((item) => {
        return {
          ...item,
          checked: this.unitGeneralObjectivesIds.includes(item.id) || false
        }
      })),
        this.$forceUpdate()
      //      this.$nextTick(() => {});
    }
  },
  methods: {
    ...mapActions(useDataStore, ['saveLearningSituationObjectives']),
    async save() {
      try {
        // Valida los datos del formulario con Yup
        await validationSchema.validate({ didacticObjectives: this.didacticObjectives }, { abortEarly: false })
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
        generalObjectivesIds: this.generalObjectives.filter((item) => item.checked).map((item) => item.id) ,
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
    id="unitMmodalComp"
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
                <table class="table table-striped">
                  <thead>
                    <th>Sel.</th>
                    <th>Codi</th>
                    <th>Descripció</th>
                  </thead>
                  <tbody>
                    <tr v-for="objective in generalObjectives" :key="objective.id">
                      <td>
                        <input type="checkbox" v-model="objective.checked" />
                      </td>
                      <td>{{ objective.code }}</td>
                      <td>{{ objective.description }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <!-- Fin tabla -->
            </div>
            <div class="cols-6">
              <label class="form-label">Objectius didàctics</label>
              <textarea class="form-control" v-model="didacticObjectives"></textarea>
              <span v-if="errors.didacticObjectives" class="error">{{ errors.didacticObjectives }}</span>
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
