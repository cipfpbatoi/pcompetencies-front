<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import * as yup from 'yup'
import { object } from 'yup'
import { validateFormErrors } from '../utils/utils.js'

const validationSchema = object({
  comments: yup
    .string()
    .trim()
    .required('La justificació és obligatòria')
    .min(5, 'Al menys han de tindre 5 caracters')
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
    if (!this.syllabus.lastYearImprovementProposal) {
      this.done = true
    } else {
      if (this.syllabus.lastYearImprovementProposal?.comments) {
        this.done = true
        this.modalFields.accepted = this.syllabus.lastYearImprovementProposal.status == 2
        this.modalFields.comments = this.syllabus.lastYearImprovementProposal.comments
      }
    }
    this.modalFields.groupContext = this.syllabus.groupContext
    this.GenericModal = new Modal(document.getElementById('unitMmodalComp'))
  },
  data() {
    return {
      done: false,
      errors: {},
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
    hasLastYearImprovementProposals(syllabus) {
      return (syllabus.lastYearImprovementProposal);
    },
    getProposalTextStatus(syllabusStatus) {
      if (syllabusStatus === 1) {
        return "Encara no s'ha donat resposta"
      } else if(syllabusStatus === 2)  {
        return "S'aplicaran les propostes de millora o part d'elles:"
      }  else {
        return "NO s'aplicaran les propostes de millora: "
      }
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
      this.errors = await validateFormErrors(validationSchema, this.modalFields)
      if (Object.keys(this.errors).length) return

      const response = await this.evaluateImprovement(this.syllabus.id, this.modalFields)
      if (response === 'ok') {
        this.done = true
        this.GenericModal.hide()
      } else {
        if (response.response?.status === 422) {
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
  <main class="border shadow view-main">
    <ModalComponent @save="saveData" title="Aplicació de les propostes de millora">
      <div class="row m-2 m-md-4 bg-light border">
        <div v-if="hasLastYearImprovementProposals(syllabus)" class="p-0 m-0">
          <p class="h5 m-0 p-2 text-center bg-info text-white"><strong>Propostes del Curs: </strong>{{ syllabus.lastYearImprovementProposal.courseYear }}</p>
          <p class="bg-light-subtle p-2">{{ syllabus.lastYearImprovementProposal.proposals }}</p>
        </div>
        <div class="form-check m-1 p-2 bg-info-subtle h5">
          <input class="form-check-input mx-3" type="checkbox" v-model="modalFields.accepted" />
          <label class="form-check-label"> Vaig a aplicar les propostes de millora o part d'elles </label>
        </div>
        <div class="mb-3">
          <label class="form-label"><strong>Resposta</strong></label>
          <textarea
            class="form-control"
            v-model="modalFields.comments"
            rows="3"
            placeholder="Has de d'indicar les propostes de millora que vas a aplicar i, si és el cas, les que no, justificant perqué no vas a aplicarles. Si vas a aplicarles totes fica 'totes'"
          ></textarea>
          <p v-if="errors.comments" class="error">{{ errors.comments }}</p>
        </div>
      </div>
    </ModalComponent>

    <app-breadcrumb :actualStep="2" :done="done"></app-breadcrumb>
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">{{ syllabus.module?.name }} ({{ (syllabus.turn === 'presential') ? 'Presencial' : 'Semi-presencial'  }}) - {{ syllabus.courseYear }}</div>
    <div class="p-lg-4 p-1">
      <h2>2. Propostes de millora</h2>
      <div class="p-2">
        <div v-if="hasLastYearImprovementProposals(syllabus)">
          <div class="card m-2">
            <div class="card-header bg-info text-white text-uppercase fw-bold">
              Propostes de millora per al Curs - <i>{{ syllabus.courseYear }}</i>
            </div>
            <div class="card-body">
              <p class="h5"><strong>Propostes del Curs: </strong>{{ syllabus.lastYearImprovementProposal.courseYear }}</p>
              <p class="border rounded bg-light p-3" v-html="syllabus.lastYearImprovementProposal.proposals"></p>
              <h4>Resposta Aplicació de les Propostes</h4>
              <div class="border p-2">
                <p>{{ getProposalTextStatus(syllabus.lastYearImprovementProposal.status) }}
                </p>
                <p class="bg-light-subtle fw-bold">{{ syllabus.lastYearImprovementProposal.comments }}</p>
              </div>
              <div class="text-center">
                <button
                  @click="showModal()"
                  class="btn btn-success mt-2 mx-auto"
                  title="Establir objectiu"
                >
                  Modificar/Donar Resposta a les propostes de millora
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <div class="card m-2">
            <div class="card-header bg-info text-white text-uppercase fw-bold">
              Propostes de millora per al Curs <i>{{ syllabus.courseYear }}</i>
            </div>
            <div class="card-body">
              <p>No hi ha propostes de millora del curs anterior</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.error {
  color: red;
}
</style>
