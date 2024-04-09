<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import * as yup from 'yup'
import { object } from 'yup'

const validationSchema = object({
  context: yup
    .string()
    .trim()
    .required('Has de posar la contextualització de la programació')
    .min(2,'Al menys han de tindre 20 caracters')
})

export default {
  components: {
    AppBreadcrumb,
  },
  computed: {
    ...mapState(useDataStore, ['syllabus'])
  },
  mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
    if (this.syllabus.groupContext) {
      this.context = this.syllabus.groupContext
      this.done = true
    }
  },
  data() {
    return {
      done: false,
      context: '',
      errors: [],
    }
  },
  methods: {
    ...mapActions(useDataStore, ['saveSyllabusGroupContext']),
    async handleForm() {
      try {
        // Valida los datos del formulario con Yup
        await validationSchema.validate({context: this.context}, { abortEarly: false })
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
      const response = 
        await this.saveSyllabusGroupContext(this.syllabus.id, {
          groupContext: this.context
        })
      if (response === 'ok'
      ) {
        this.done = true
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
  <main>
    <app-breadcrumb :actualStep="2" :done="done"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }})</h2>
    <h3>Contextualització</h3>
    <p v-html="syllabus.center?.contextualization"></p>
    <p v-html="syllabus.cycleCenterContext?.studentsProfile"></p>
      <form @submit.prevent="handleForm">
          <textarea class="form-control" v-model="context" rows="5"
          placeholder="Contextualització de la programació"></textarea>
          <p v-if="errors.context" class="error">{{ errors.context }}</p>
        <button type="submit" class="btn btn-secondary">Guardar</button>
      </form>
  </main>
</template>

<style scoped>
.error {
  color: red;
}
</style>