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
      newContent: '',
      deployedRaContent: 0,
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
    getContentsBlock(ra) {
      return (
        this.module.learningResults?.find((item) => item.id === ra.learningResult.id)
          .contentsBlock || []
      )
    },
    toogleDeployedRaContent(raId) {
      this.deployedRaContent = this.deployedRaContent == raId ? 0 : raId
    },
    showModal(modal) {
      this.modal = modal
      switch (modal) {
        case 'objectives':
          this.ObjectivesModal = new Modal(document.getElementById('objectivesModalComp'))
          this.ObjectivesModal.show()
          break
        case 'priorKnowledges':
          this.modalTitle = `${this.learningSituation.position}: ${this.learningSituation.title}`
          this.modalFields = { priorKnowledge: this.learningSituation.priorKnowledge }
          this.GenericModal = new Modal(document.getElementById('unitMmodalComp'))
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
    addContent(raContent) {
      let newContent = ''
      if (raContent) {
        newContent = raContent
      } else {
        if (!this.newContent.trim()) {
          this.errors.newContent = "Has d'introduir el nou contingut"
          return
        }
        newContent = this.newContent
      }
      const newContents = this.learningSituation.didacticContents.map((item) => item.descriptor)
      newContents.push(newContent)
      this.saveContents(this.learningSituation.id, newContents)
      this.newContent = ''
    },
    editContent(content, index) {
      const editedContent = prompt('Modifica el contingut', content.descriptor)
      if (editedContent) {
        const descriptors = this.learningSituation.didacticContents
            .map((item) => item.descriptor)
        descriptors[index] = editedContent
        this.saveContents(this.learningSituation.id, descriptors)
      }
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
    <ModalComponent v-if="lsLoaded" @save="saveData" :title="modalTitle">
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

    <h4>Competències</h4>
    <br /><br />

    <ObjectivesModal
      v-if="lsLoaded"
      @saved="savedObjectives"
      :unit="learningSituation"
    ></ObjectivesModal>
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
      <div class="bordered" v-for="result in learningSituation.ponderedLearningResults" :key="result.id">
        <div class="position-relative">
          <h5 class="position-absolute start-0">
            RA {{ result.learningResult.number }}: {{ result.learningResult.descriptor }}
          </h5>
          <button
            class="position-absolute end-0 btn btn-link"
            @click="toogleDeployedRaContent(result.id)"
            type="button"
            title="Mostra els criteris d'avaluació"
          >
            <i class="bi bi-eye"></i>
          </button>
        </div>
        <br /><br>
        <div v-if="result.id === deployedRaContent">
          <div v-for="block in getContentsBlock(result)" :key="block.id">
            <h5>{{ block.title }}</h5>
            <ShowTable :data="block.contents" :columns="{ title: 'Continguts' }">
              <template v-slot="{ item }">
                <button
                  @click="addContent(item)"
                  class="btn btn-secondary"
                  title="Afegir contingut"
                >
                  <i class="bi bi-plus"></i>
                </button>
              </template>
            </ShowTable>
          </div>
        </div>
      </div>
      <h5>Continguts de la Situació d'Aprenentatge</h5>
      <show-table :data="learningSituation.didacticContents" :columns="didacticContentsColumns">
        <template v-slot="{ item, index }">
          <button
            @click="changeContentPosition(item, -1)"
            class="btn btn-secondary"
            title="Pujar"
            :disabled="item.position <= 1"
          >
            <i class="bi bi-arrow-up"></i>
          </button>
          <button
            :disabled="item.position >= learningSituation.didacticContents.length"
            @click="changeContentPosition(item, 1)"
            class="btn btn-secondary"
            title="Baixar"
          >
            <i class="bi bi-arrow-down"></i>
          </button>
          <button @click="editContent(item, index)" class="btn btn-secondary" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button @click="delContent(item, index)" class="btn btn-secondary" title="Eliminar">
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
    <br /><br />
    <h4>Activitats</h4>
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
