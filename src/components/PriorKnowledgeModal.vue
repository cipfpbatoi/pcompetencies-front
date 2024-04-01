<script>
import { mapActions } from 'pinia'
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
  },
  data() {
    return {
      priorKnowledge: '',
      errors: []
    }
  },
  watch: {
    unit(newValue) {
      this.priorKnowledge = newValue.priorKnowledge
        this.$forceUpdate()
      //      this.$nextTick(() => {});
    }
  },
  methods: {
    ...mapActions(useDataStore, ['saveLearningSituationPriorKnowledge']),
    async save() {
      try {
        // Valida los datos del formulario con Yup
        //        await validationSchema.validate(this.editedUnit, { abortEarly: false })
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
      if (!this.priorKnowledge) {
        if (!confirm("Vas a eliminar els coneixements previs d'aquesta situació d'aprenentatge")) {
          return
        }
      }
      const response = await this.saveLearningSituationPriorKnowledge(this.unit.id, {
        priorKnowledge: this.priorKnowledge,
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
              <label class="form-label">Coneixements previs</label>
              <textarea class="form-control" v-model="priorKnowledge"></textarea>
              <span v-if="errors.priorKnowledge" class="error">{{ errors.priorKnowledge }}</span>
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
