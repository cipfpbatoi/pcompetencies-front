<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import ObjectivesModal from '../components/ObjectivesModal.vue'
import ShowTable from '@/components/ShowTable.vue'
import LsDevContents from '@/components/LsDevContents.vue'
import LsDevActivity from '@/components/LsDevActivity.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '../components/AppBreadcrumb.vue'
import { api } from '../repositories/api'
import { makeCheckeableArray, getObjectsIds } from '../utils/utils.js'

const generaObjectivesColumns = [
  {
    title: 'Codi',
    value: 'code'
  },
  {
    title: 'Descripció',
    value: 'description'
  }
]

const transversalObjectivesColumns = [
  {
    title: 'Codi',
    value: 'code'
  },
  {
    title: 'Objectiu',
    value: 'description'
  },
  {
    title: 'Àrea',
    value: 'area'
  }
]

const moduleCycleCompetencesColumns = [
  {
    title: 'Codi',
    value: 'code'
  },
  {
    title: 'Descripció',
    value: 'descriptor'
  }
]

const methodologiesColumns = [
  {
    title: 'Nom',
    value: 'name'
  },
  {
    title: 'Descripció',
    value: 'description'
  }
]

export default {
  props: ['lsId'],
  components: {
    AppBreadcrumb,
    ShowTable,
    LsDevContents,
    LsDevActivity,
    ModalComponent,
    ObjectivesModal
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'module', 'transversalObjectives']),
    assessmentToolsSourceLabel() {
      if (this.assessmentToolsSource === 'pcc') return 'PCC'
      if (this.assessmentToolsSource === 'center') return 'centre'
      return 'no indicat'
    },
    pendingMandatoryAssessmentTools() {
      const selectedIds = this.availableAssessmentTools
        .filter((tool) => tool.selected)
        .map((tool) => tool.id)
      return this.mandatoryAssessmentTools.filter((tool) => !selectedIds.includes(tool.id))
    },
    done() {
      return (
        this.learningSituation.generalObjectives?.length &&
        this.learningSituation.didacticObjectives
      )
    },
    transversalObjectivesArray() {
      let transversals = []
      this.transversalObjectives.forEach(
        (element) =>
          (transversals = transversals.concat(
            element.objectives.map((item) => {
              return {
                id: item.id,
                code: item.code,
                description: item.description,
                type: element.transversalElement.type,
                area: element.transversalElement.area
              }
            })
          ))
      )
      return transversals
    }
  },
  data() {
    return {
      learningSituation: {},
      lsLoaded: false,
      errors: {},
      modal: '',
      moduleCycleCompetencesColumns,
      methodologiesColumns,
      competencesCheckeables: [],
      methodologiesCheckeables: [],
      // Modal generic
      GenericModal: null,
      modalId: '',
      modalFields: {},
      modalTitle: '',
      // Modal Objectius
      ObjectivesModal: null,
      TransversalObjectivesModal: null,
      transversalsCheckeables: [],
      generaObjectivesColumns,
      assessmentToolsSource: '',
      availableAssessmentTools: [],
      mandatoryAssessmentTools: [],
      availableMethodologies: [],
      transversalObjectivesColumns
    }
  },
  async mounted() {
    await this.fetchLearningSituation()
    await this.loadAssessmentToolsStatus()
    await this.loadAvailableMethodologies()
    this.lsLoaded = true
  },
  watch: {
    'syllabus.id'() {
      this.loadAssessmentToolsStatus()
      this.loadAvailableMethodologies()
    }
  },
  methods: {
    ...mapActions(useDataStore, [
      'addMessage',
      'saveLearningSituationPriorKnowledge',
      'saveLearningSituationCompetences',
      'saveLSTransversalObjectives'
    ]),
    async fetchLearningSituation() {
      try {
        const response = await api.getLearningSituationById(this.lsId)
        this.learningSituation = response.data
        this.lsLoaded = true
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async loadAssessmentToolsStatus() {
      if (!this.syllabus.id) return

      try {
        const response = await api.getAvailableSyllabusAssessmentTools(this.syllabus.id)
        this.assessmentToolsSource = response.data?.source || ''
        this.availableAssessmentTools = response.data?.available || []
        this.mandatoryAssessmentTools =
          response.data?.mandatory || this.availableAssessmentTools.filter((tool) => tool.mandatory)
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async loadAvailableMethodologies() {
      if (!this.syllabus.id) return

      try {
        const response = await api.getAvailableSyllabusMethodologicalPrinciples(this.syllabus.id)
        this.availableMethodologies = (response.data?.available || []).filter(
          (item) => item.selected && item.category === 'methodology'
        )
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async refreshLearningSituationAndAssessmentTools() {
      await this.fetchLearningSituation()
      await this.loadAssessmentToolsStatus()
    },

    showModal(modal) {
      this.modal = modal
      this.modalId = modal + 'Modal'
      switch (modal) {
        case 'objectives':
          this.ObjectivesModal = new Modal(document.getElementById('objectivesModalComp'))
          this.ObjectivesModal.show()
          break
        case 'transversals':
          this.transversalsCheckeables = makeCheckeableArray(
            this.transversalObjectivesArray,
            this.learningSituation.transversalObjectivesItems
          )
          this.modalTitle = `${this.learningSituation.position}: ${this.learningSituation.title}`
          this.modalFields = { transversals: this.learningSituation.transversalObjectivesItem }
          this.GenericModal = new Modal(document.getElementById(this.modalId))
          this.GenericModal.show()
          break
        case 'competences':
          this.competencesCheckeables = makeCheckeableArray(
            this.syllabus.moduleCycleCompetences,
            this.learningSituation.competences
          )
          this.errors.competences = ''
          this.modalTitle = `${this.learningSituation.position}: ${this.learningSituation.title}`
          this.modalFields = { competences: this.learningSituation.competences }
          this.GenericModal = new Modal(document.getElementById(this.modalId))
          this.GenericModal.show()
          break
        case 'methodologies':
          this.methodologiesCheckeables = makeCheckeableArray(
            this.availableMethodologies,
            this.learningSituation.methodologicalPrinciples
          )
          this.errors.methodologies = ''
          this.modalTitle = `${this.learningSituation.position}: ${this.learningSituation.title}`
          this.GenericModal = new Modal(document.getElementById(this.modalId))
          this.GenericModal.show()
          break
        case 'priorKnowledge':
          this.modalTitle = `${this.learningSituation.position}: ${this.learningSituation.title}`
          this.modalFields = { priorKnowledge: this.learningSituation.priorKnowledge }
          this.GenericModal = new Modal(document.getElementById(this.modalId))
          this.GenericModal.show()
      }
    },
    async saveData() {
      let response = ''
      if (this.modal === 'priorKnowledge') {
        if (!this.modalFields.priorKnowledge) {
          if (
            !confirm("Vas a eliminar els coneixements previs d'aquesta situació d'aprenentatge")
          ) {
            return
          }
        }
        response = await this.saveLearningSituationPriorKnowledge(this.learningSituation.id, {
          priorKnowledge: this.modalFields.priorKnowledge
        })
      } else if (this.modal === 'competences') {
        const competencesChecked = this.competencesCheckeables.filter((item) => item.checked)
        if (!competencesChecked.length) {
          this.errors.competences =
            "La situació d'aprenentatge ha d'anar assiciada a alguna competència"
          return
        }
        response = await this.saveLearningSituationCompetences(this.learningSituation.id, {
          competencesIds: getObjectsIds(competencesChecked)
        })
      } else if (this.modal === 'methodologies') {
        const methodologiesChecked = this.methodologiesCheckeables.filter((item) => item.checked)
        try {
          const apiResponse = await api.saveLearningSituationMethodologies(this.learningSituation.id, {
            methodologicalPrinciplesIds: getObjectsIds(methodologiesChecked)
          })
          this.learningSituation = apiResponse.data
          const lsIndex = this.syllabus.learningSituations?.findIndex(
            (item) => item.id === this.learningSituation.id
          )
          if (lsIndex > -1) {
            this.syllabus.learningSituations.splice(lsIndex, 1, apiResponse.data)
          }
          this.GenericModal.hide()
          this.addMessage('success', 'Metodologies guardades')
          return
        } catch (error) {
          this.addMessage('error', error)
          return
        }
      } else if (this.modal === 'transversals') {
        const transversalObjectivesChecked = this.transversalsCheckeables.filter((item) => item.checked)
        response = await this.saveLSTransversalObjectives(this.learningSituation.id, {
          transversalObjectivesIds: getObjectsIds(transversalObjectivesChecked)
        })
      } else {
        console.error('Lanzado save ' + this.modal)
      }
      if (response === 'ok') {
        this.GenericModal.hide()
        this.fetchLearningSituation()
      } else {
        if (response.response?.status == 422) {
          const serverError = response.response.data.detail.split(': ')
          this.errors[serverError[0]] = serverError[1]
          return
        }
      }
    },
    savedObjectives() {
      this.fetchLearningSituation()
      this.ObjectivesModal.hide()
    }
  }
}
</script>
<template>
  <main class="border shadow view-main">
    <app-breadcrumb :actualStep="6" :done="true" :back="true"></app-breadcrumb>
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">{{ syllabus.module?.name }} ({{ (syllabus.turn === 'presential') ? 'Presencial' : 'Semi-presencial'  }}) - {{ syllabus.courseYear }}</div>
    <div class="text-center mt-5" :class="{ 'd-none': this.lsLoaded }">
      <span class="spinner-border text-primary"></span>
    </div>
    <div class="p-lg-4 p-1" :class="{ 'd-none': !this.lsLoaded }">
      <h3>S.A. {{ learningSituation.position }}: {{ learningSituation.title }} - <span class= "fw-bold text-primary"> ({{learningSituation.hours}} Hores)</span></h3>
      <div>
        <h4 class="bg-primary-subtle p-2 mb-0 fw-bold">6.1 Objectius</h4>
        <div class="bordered border-primary-subtle mt-0">
          <h5 class="fw-bold p-2">6.1.1 Objectius generals</h5>
          <show-table
            :data="learningSituation.generalObjectives"
            :columns="generaObjectivesColumns"
          >
          </show-table>
          <h5 class="fw-bold p-2">6.1.2 Objectius didàctics</h5>
          <p v-html="learningSituation.didacticObjectives"></p>
        </div>
        <div class="text-center">
          <button
            @click="showModal('objectives')"
            class="btn btn-success"
            title="Establir objectiu"
          >
            Establir els objectius
          </button>
        </div>
      </div>
      <br />
      <div>
        <h4 class="bg-primary-subtle p-2 mb-0 fw-bold">6.2 Objectius transversals</h4>
        <div class="bordered border-primary-subtle mt-0">
          <ModalComponent
            v-if="lsLoaded"
            @save="saveData"
            modalId="transversalsModal"
            :title="modalTitle"
          >
            <h5>Selecciona els objectius transversals</h5>
            <ShowTable
              :checkeable="true"
              :actions="false"
              :data="transversalsCheckeables"
              :columns="transversalObjectivesColumns"
            >
            </ShowTable>
            <p v-if="errors.transversals" class="error">{{ errors.transversals }}</p>
          </ModalComponent>
          <ShowTable
            class="bordered"
            :actions="false"
            :data="learningSituation.transversalObjectivesItems"
            :columns="transversalObjectivesColumns"
          >
          </ShowTable>
        </div>
        <div class="text-center">
          <button
            @click="showModal('transversals')"
            class="btn btn-success"
            title="Establir objectius transversals"
          >
            Establir els objectius transversals
          </button>
        </div>
      </div>
      <br />
      <div>
        <h4 class="bg-primary-subtle p-2 mb-0 fw-bold">6.3 Competències</h4>
        <div class="bordered border-primary-subtle mt-0">
          <ModalComponent
            v-if="lsLoaded"
            @save="saveData"
            modalId="competencesModal"
            :title="modalTitle"
          >
            <h5>Selecciona les competències</h5>
            <ShowTable
              :checkeable="true"
              :actions="false"
              :data="competencesCheckeables"
              :columns="moduleCycleCompetencesColumns"
            >
            </ShowTable>
            <p v-if="errors.competences" class="error">{{ errors.competences }}</p>
          </ModalComponent>
          <ShowTable
            class="bordered"
            :actions="false"
            :data="learningSituation.competences"
            :columns="moduleCycleCompetencesColumns"
          >
          </ShowTable>
        </div>
        <div class="text-center">
          <button
            @click="showModal('competences')"
            class="btn btn-success"
            title="Establir competències"
          >
            Establir les competències
          </button>
        </div>
      </div>
      <br />
      <ObjectivesModal
        v-if="lsLoaded"
        @saved="savedObjectives"
        :unit="learningSituation"
      ></ObjectivesModal>

      <h4 class="bg-primary-subtle p-2 mb-0 fw-bold">6.4 Coneixements previs</h4>
      <div class="bordered border-primary-subtle mt-0">
        <ModalComponent
          v-if="lsLoaded"
          @save="saveData"
          modalId="priorKnowledgeModal"
          :title="modalTitle"
        >
          <div class="row">
            <label class="form-label fw-bold">Coneixements previs</label>
            <textarea class="form-control" v-model="modalFields.priorKnowledge"></textarea>
            <span v-if="errors.priorKnowledge" class="error">{{ errors.priorKnowledge }}</span>
          </div>
        </ModalComponent>
        <div class="bordered">
          <p>{{ learningSituation.priorKnowledge || 'No hi ha dades que mostrar' }}</p>
        </div>
      </div>
      <div class="text-center">
        <button
          @click="showModal('priorKnowledge')"
          class="btn btn-success"
          title="Establir objectiu"
        >
          Establir els coneixements previs
        </button>
      </div>
      <br />

      <h4 class="bg-primary-subtle p-2 mb-0 fw-bold">6.5 Metodologies Específiques</h4>
      <div class="bordered border-primary-subtle mt-0">
        <ModalComponent
          v-if="lsLoaded"
          @save="saveData"
          modalId="methodologiesModal"
          :title="modalTitle"
        >
          <h5>Selecciona les metodologies</h5>
          <div class="alert alert-info" role="alert">
            Només es poden seleccionar metodologies assignades prèviament a la programació. (Pas 5)
          </div>
          <ShowTable
            :checkeable="true"
            :actions="false"
            :data="methodologiesCheckeables"
            :columns="methodologiesColumns"
          >
          </ShowTable>
          <p v-if="errors.methodologies" class="error">{{ errors.methodologies }}</p>
        </ModalComponent>
        <div v-if="!learningSituation.methodologicalPrinciples?.length" class="alert alert-warning">
          Aquesta situació d'aprenentatge no té cap metodologia assignada.
        </div>
        <ShowTable
          v-else
          class="bordered"
          :actions="false"
          :data="learningSituation.methodologicalPrinciples"
          :columns="methodologiesColumns"
        >
        </ShowTable>
      </div>
      <div class="text-center">
        <button
          @click="showModal('methodologies')"
          class="btn btn-success"
          title="Establir metodologies"
        >
          Establir les metodologies
        </button>
      </div>
      <br />

      <h4 class="bg-primary-subtle p-2 mb-0 fw-bold">6.6 Continguts</h4>
      <div class="bordered border-primary-subtle mt-0">
        <LsDevContents
          :learningSituation="learningSituation"
          @saved="fetchLearningSituation"
        ></LsDevContents>
      </div>
      <br />
      <h4 class="bg-primary-subtle p-2 mb-0 fw-bold">6.7 Activitats Qualificables</h4>
      <div v-if="pendingMandatoryAssessmentTools.length" class="alert alert-warning" role="alert">
        <strong>Falten instruments d'avaluació obligatoris per utilitzar.</strong>
        <div>
          Cada instrument obligatori ha d'aparéixer almenys en una activitat qualificable d'alguna
          S.A.
        </div>
        <div class="mt-2">
          <span>Obligatoris pendents segons {{ assessmentToolsSourceLabel }}:</span>
          <ul class="mb-0">
            <li v-for="tool in pendingMandatoryAssessmentTools" :key="tool.id">
              {{ tool.name }}
            </li>
          </ul>
        </div>
      </div>
      <div v-else class="alert alert-success" role="alert">
        Tots els instruments d'avaluació obligatoris estan utilitzats en activitats qualificables.
      </div>
      <LsDevActivity v-if="lsLoaded"
        type="marking"
        :learningSituation="learningSituation"
        @saved="refreshLearningSituationAndAssessmentTools"
      ></LsDevActivity>
      <br /><br />

      <h4 class="bg-primary-subtle p-2 mb-0 fw-bold">
        6.8 Activitats Formatives (NO qualificables)
      </h4>
      <LsDevActivity
      v-if="lsLoaded"
        type="formative"
        :learningSituation="learningSituation"
        @saved="fetchLearningSituation"
      ></LsDevActivity>
      <br /><br />

      <h4 class="bg-primary-subtle p-2 mb-0 fw-bold">6.9 Activitats de Repàs</h4>
      <LsDevActivity
      v-if="lsLoaded"
        type="reinforcement"
        :learningSituation="learningSituation"
        @saved="fetchLearningSituation"
      ></LsDevActivity>
      <br /><br />

      <h4 class="bg-primary-subtle p-2 mb-0 fw-bold">6.10 Activitats d'Aprofundiment</h4>
      <LsDevActivity
      v-if="lsLoaded"
        type="deepening"
        :learningSituation="learningSituation"
        @saved="fetchLearningSituation"
      ></LsDevActivity>
    </div>
  </main>
</template>

<style scoped>
.bordered {
  border: 1px solid black;
  padding: 5px;
  margin: 5px auto;
}
.error {
  color: red;
}
</style>
