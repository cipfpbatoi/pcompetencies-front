<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import ObjectivesModal from '../components/ObjectivesModal.vue'
import ShowTable from '@/components/ShowTable.vue'
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

const didacticContentsColumns = [
  {
    title: 'Num.',
    value: 'position'
  },
  {
    title: 'Contingut',
    value: 'descriptor'
  }
]

export default {
  props: ['lsId'],
  components: {
    AppBreadcrumb,
    ShowTable,
    ModalComponent,
    ObjectivesModal
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'cycle']),
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
      errors: [],
      modal: '',
      newContent: '',
      // Modal generic
      GenericModal: null,
      modalFields: {},
      modalTitle: '',
      didacticContentsColumns,
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
    this.GenericModal = new Modal(document.getElementById('unitMmodalComp'))
    this.ObjectivesModal = new Modal(document.getElementById('objectivesModalComp'))
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage', 'saveLearningSituationPriorKnowledge']),
    async fetchLearningSituation() {
      const response = await api.getLearningSituationById(this.lsId)
      this.learningSituation = response.data
    },
    showModal(modal) {
      this.modal = modal
      switch (modal) {
        case 'objectives':
          this.ObjectivesModal.show()
          break
        case 'priorKnowledges':
          this.modalTitle = `${this.learningSituation.position}: ${this.learningSituation.title}`
          this.modalFields = { priorKnowledge: this.learningSituation.priorKnowledge }
          this.GenericModal.show()
      }
    },
    async saveData() {
      switch (this.modal) {
        case 'priorKnowledges': {
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
    addContent() {
      if (!this.newContent.trim()) {
        this.errors.newContent = "Has d'introduir el nou contingut"
        return
      }
      const newContents = this.learningSituation.didacticContents.map((item) => item.descriptor)
      newContents.push(this.newContent)
      this.saveContents(this.learningSituation.id, newContents)
      this.newContent = ''
    },
    delContent(content) {
      if (
        confirm(
          'ATENCIÓ: Vas a esborrar el contingut "' +
            content.descriptor +
            '". Aquest procés NO es por des-fer !!!'
        )
      ) {
        this.saveContents(
          this.learningSituation.id,
          this.learningSituation.didacticContents
            .filter((item) => item.id != content.id)
            .map((item) => item.descriptor)
        )
      }
    },
    changeContentPosition(content, newPosition) {
      const contentToSwap = this.learningSituation.didacticContents.find(
        (item) => item.position == content.position + newPosition
      )
      if (contentToSwap) {
        contentToSwap.position = content.position
      }
      content.position = content.position + newPosition
      this.saveContents(
        this.learningSituation.id,
        this.learningSituation.didacticContents
          .sort((item1, item2) => item1.position - item2.position)
          .map((item) => item.descriptor)
      )
    },
    async saveContents(lsId, contentDescriptors) {
      try {
        await api.saveLearningSituationContents(lsId, { contentDescriptors })
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
    <ModalComponent @save="saveData" :title="modalTitle">
      <div class="row">
        <label class="form-label">Coneixements previs</label>
        <textarea class="form-control" v-model="modalFields.priorKnowledge"></textarea>
        <span v-if="errors.priorKnowledge" class="error">{{ errors.priorKnowledge }}</span>
      </div>
    </ModalComponent>

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

    <ObjectivesModal @saved="savedObjectives" :unit="learningSituation"></ObjectivesModal>
    <h4>Coneixements previs</h4>
    <div class="bordered">
      <p>{{ learningSituation.priorKnowledge || 'No hi ha dades que mostrar' }}</p>
    </div>
    <button
      @click="showModal('priorKnowledges')"
      class="btn btn-secondary"
      title="Establir objectiu"
    >
      Establir els coneixements previs
    </button>
    <br />
    <br />

    <h4>Continguts</h4>
    <div class="bordered">
      <show-table :data="learningSituation.didacticContents" :columns="didacticContentsColumns">
        <template v-slot="{ item, index }">
          <button
            @click="changeContentPosition(item, -1)"
            class="btn btn-link"
            title="Pujar"
            :disabled="item.position <= 1"
          >
            <i class="bi bi-arrow-up"></i>
          </button>
          <button
            :disabled="item.position >= learningSituation.didacticContents.length"
            @click="changeContentPosition(item, 1)"
            class="btn btn-link"
            title="Baixar"
          >
            <i class="bi bi-arrow-down"></i>
          </button>
          <button @click="delContent(item, index)" class="btn btn-link" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
        </template>
      </show-table>
      <form @submit.prevent="addContent">
        <div class="input-group">
          <input
            type="text"
            class="form-control"
            v-model="newContent"
            placeholder="Afegir nou contingut"
          />
          <button type="submit" class="btn btn-secondary" title="Establir objectiu">
            Afegir nou contingut
          </button>
        </div>
        <span v-if="errors.newContent" class="error">{{ errors.newContent }}</span>
      </form>
    </div>
    <br />
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
