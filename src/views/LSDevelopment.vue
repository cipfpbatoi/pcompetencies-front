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
    ...mapState(useDataStore, ['syllabus', 'module']),
    done() {
      return (
        this.learningSituation.generalObjectives?.length &&
        this.learningSituation.didacticObjectives
      )
    }
  },
  data() {
    return {
      learningSituation: {},
      lsLoaded: false,
      errors: [],
      modal: '',
      // Modal generic
      GenericModal: null,
      modalId: '',
      modalFields: {},
      modalTitle: '',
      // Modal Objectius
      ObjectivesModal: null,
      generaObjectivesColumns
    }
  },
  async mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
    this.fetchLearningSituation()
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage', 'saveLearningSituationPriorKnowledge']),
    async fetchLearningSituation() {
      try {
        const response = await api.getLearningSituationById(this.lsId)
        this.learningSituation = response.data
        this.lsLoaded = true
      } catch (error) {
        this.addMessage('error', error)
      }
    },

    showModal(modal) {
      this.modal = modal
      this.modalId = modal + 'Modal'
      switch (modal) {
        case 'objectives':
          this.ObjectivesModal = new Modal(document.getElementById('objectivesModalComp'))
          this.ObjectivesModal.show()
          break
        case 'priorKnowledge':
          this.modalTitle = `${this.learningSituation.position}: ${this.learningSituation.title}`
          this.modalFields = { priorKnowledge: this.learningSituation.priorKnowledge }
          this.GenericModal = new Modal(document.getElementById(this.modalId))
          this.GenericModal.show()
      }
    },
    async saveData() {
      switch (this.modal) {
        case 'priorKnowledge': {
          if (!this.modalFields.priorKnowledge) {
            if (
              !confirm("Vas a eliminar els coneixements previs d'aquesta situació d'aprenentatge")
            ) {
              return
            }
          }
          const response = await this.saveLearningSituationPriorKnowledge(
            this.learningSituation.id,
            {
              priorKnowledge: this.modalFields.priorKnowledge
            }
          )
          if (response === 'ok') {
            this.GenericModal.hide()
          } else {
            if (response.response?.status == 422) {
              const serverError = response.response.data.detail.split(': ')
              this.errors[serverError[0]] = serverError[1]
              return
            }
          }
          break
        }
        default:
          console.error('Lanzado save ' + this.modal)
          break
      }
      this.fetchLearningSituation()
    },
    savedObjectives() {
      this.fetchLearningSituation()
      this.ObjectivesModal.hide()
    },
    async saveContents(contentDescriptors) {
      try {
        await api.saveLearningSituationContents(this.learningSituation.id, { contentDescriptors })
        this.addMessage('success', 'Continguts guardats')
      } catch (error) {
        this.addMessage('error', error)
      }
      this.fetchLearningSituation()
    }
  }
}
</script>

<template>
  <main>
    <app-breadcrumb :actualStep="7" :done="false" :params="{ lsId }"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }})</h2>
    <h3>S.A. {{ learningSituation.position }}: {{ learningSituation.title }}</h3>
    <h4>Objectius</h4>
    <div class="bordered">
      <h5>Objectius generals</h5>
      <show-table :data="learningSituation.generalObjectives" :columns="generaObjectivesColumns">
      </show-table>
      <h5>Objectius didàctics</h5>
      <p>{{ learningSituation.didacticObjectives || 'No hi ha dades que mostrar' }}</p>
    </div>
    <button @click="showModal('objectives')" class="btn btn-secondary" title="Establir objectiu">
      Establir els objectius
    </button>
    <br />
    <br />

    <h4>Competències</h4>
    <button disabled @click="showModal('objectives')" class="btn btn-secondary" title="Establir objectiu">
      Establir les competències
    </button>
    <br /><br />

    <ObjectivesModal
      v-if="lsLoaded"
      @saved="savedObjectives"
      :unit="learningSituation"
    ></ObjectivesModal>

    <h4>Coneixements previs</h4>
    <ModalComponent v-if="lsLoaded" @save="saveData" modalId="priorKnowledgeModal" :title="modalTitle">
      <div class="row">
        <label class="form-label">Coneixements previs</label>
        <textarea class="form-control" v-model="modalFields.priorKnowledge"></textarea>
        <span v-if="errors.priorKnowledge" class="error">{{ errors.priorKnowledge }}</span>
      </div>
    </ModalComponent>

    <div class="bordered">
      <p>{{ learningSituation.priorKnowledge || 'No hi ha dades que mostrar' }}</p>
    </div>
    <button
      @click="showModal('priorKnowledge')"
      class="btn btn-secondary"
      title="Establir objectiu"
    >
      Establir els coneixements previs
    </button>
    <br />
    <br />

    <h4>Continguts</h4>
    <LsDevContents 
      :learningSituation="learningSituation"
      @save="saveContents"
    ></LsDevContents>
    <br /><br />

    <h4>Activitats Qualificables</h4>
    <LsDevActivity type="marking" :learningSituation="learningSituation" @saved="fetchLearningSituation"></LsDevActivity>
    <br /><br />

    <h4>Activitats Formatives (NO qualificables)</h4>
    <LsDevActivity type="formative" :learningSituation="learningSituation" @saved="fetchLearningSituation"></LsDevActivity>
    <br /><br />

    <h4>Activitats de Repas</h4>
    <LsDevActivity type="reinforcement" :learningSituation="learningSituation" @saved="fetchLearningSituation"></LsDevActivity>
    <br /><br />

    <h4>Activitats d'Aprofundiment</h4>
    <LsDevActivity type="deepening" :learningSituation="learningSituation" @saved="fetchLearningSituation"></LsDevActivity>
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
