<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import * as yup from 'yup'
import { object } from 'yup'

const validationSchema = object({
  comments: yup
    .string()
    .trim()
    .required('La justificació és obligatòria')
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
    if (!this.syllabus.improvementProposal) {
      this.done = true
    } else {
      if (this.syllabus.improvementProposal.comments) {
        this.done = true
        this.data.accepted = this.syllabus.improvementProposal.status == 2
        this.data.comments = this.syllabus.improvementProposal.comments
      }
    }
  },
  data() {
    return {
      done: false,
      data: {
        accepted: false,
        comments: ''
      },
      errors: []
    }
  },
  methods: {
    ...mapActions(useDataStore, ['evaluateImprovement']),
    async handleForm() {
      if (!this.data.accepted) {
        if (!confirm("Estas indicant que NO vas a aplicar cap d'aquestes propostes, ni siquiera parcialment. ¿Vols continuar amb aquesta elecció?")) {
          return
        }
      }
      try {
        // Valida los datos del formulario con Yup
        await validationSchema.validate(this.data, { abortEarly: false })
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
        await this.evaluateImprovement(this.syllabus.id, this.data)
      if (response === 'ok'
      ) {
        this.done = true
        this.data.accepted = this.syllabus.improvementProposal.status == 2
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
    <app-breadcrumb :actualStep="3" :done="done"></app-breadcrumb>
    <h2>{{ syllabus.module.name }} ({{ syllabus.turn }})</h2>
    <h3>Propostes de millora</h3>
    <div v-if="syllabus.improvementProposal">
      <p>{{ syllabus.improvementProposal.proposals }}</p>
      <form @submit.prevent="handleForm">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" v-model="data.accepted" />
          <label class="form-check-label"> Vaig a aplicar aquestes propostes p part d'elles </label>
        </div>
        <div class="mb-3">
          <label class="form-label">Justificació</label>
          <textarea class="form-control" v-model="data.comments" rows="3"></textarea>
          <p v-if="errors.comments" class="error">{{ errors.comments }}</p>
        </div>
        <button type="submit" class="btn btn-secondary">Enviar</button>
      </form>
    </div>
    <div v-else>
      <p>No hi ha propostes de millora</p>
    </div>
  </main>
</template>

<style scoped>
.error {
  color: red;
}
</style>