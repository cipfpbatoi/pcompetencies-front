<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
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
    .min(2, 'Al menys han de tindre 20 caracters')
})

export default {
  components: {
    AppBreadcrumb,
    ModalComponent
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
        this.modalFields.accepted = this.syllabus.improvementProposal.status == 2
        this.modalFields.comments = this.syllabus.improvementProposal.comments
      }
    }
    this.modalFields.groupContext = this.syllabus.groupContext
    this.GenericModal = new Modal(document.getElementById('unitMmodalComp'))
  },
  data() {
    return {
      done: false,
      errors: [],
      GenericModal: null,
      modalFields: {
        accepted: false,
        comments: ''
      }
    }
  },
  methods: {
    ...mapActions(useDataStore, ['evaluateImprovement']),
    showModal() {
      this.GenericModal.show()
    },
    async saveData() {
      if (!this.modalFields.accepted) {
        if (
          !confirm(
            "Estas indicant que NO vas a aplicar cap d'aquestes propostes, ni siquiera parcialment. ¿Vols continuar amb aquesta elecció?"
          )
        ) {
          return
        }
      }
      try {
        // Valida los datos del formulario con Yup
        await validationSchema.validate(this.modalFields, { abortEarly: false })
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
      const response = await this.evaluateImprovement(this.syllabus.id, this.modalFields)
      if (response === 'ok') {
        this.done = true
        this.syllabus.improvementProposal.status = this.modalFields.accepted ? 2 : 3
        this.syllabus.improvementProposal.comments = this.modalFields.comments
        this.GenericModal.hide()
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
    <ModalComponent @save="saveData" title="Aplicació de les propostes de millora">
      <div class="row">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" v-model="modalFields.accepted" />
          <label class="form-check-label"> Vaig a aplicar aquestes propostes p part d'elles </label>
        </div>
        <div class="mb-3">
          <label class="form-label"><strong>Justificació</strong></label>
          <textarea
            class="form-control"
            v-model="modalFields.comments"
            rows="3"
            placeholder="Justificació"
          ></textarea>
          <p v-if="errors.comments" class="error">{{ errors.comments }}</p>
        </div>
      </div>
    </ModalComponent>

    <app-breadcrumb :actualStep="3" :done="done"></app-breadcrumb>

    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }})</h2>
    <h3>Propostes de millora</h3>
    <div class="p-2">
      <div v-if="syllabus.improvementProposal">
        <p class="border p-2" v-html="syllabus.improvementProposal.proposals"></p>
        <h4><i>Feedback</i> de la proposta</h4>
        <div class="border bg-light p-2">
          <p>
            {{
              syllabus.improvementProposal.status == 2
                ? "S'aplicaran les propostes de millora o part d'elles."
                : "NO s'aplicaran les propostes de millora."
            }}
          </p>
          <p>{{ syllabus.improvementProposal.comments }}</p>
        </div>
        <button @click="showModal()" class="btn btn-secondary mt-2" title="Establir objectiu">
          Establir l'aplicació de les propostes de millora
        </button>
      </div>
      <div v-else>
        <p>No hi ha propostes de millora</p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.error {
  color: red;
}
</style>
