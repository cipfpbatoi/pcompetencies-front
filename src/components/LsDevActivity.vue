<script>
import ShowTable from './ShowTable.vue'
import { useDataStore } from '@/stores/data'
import { mapState, mapActions } from 'pinia'
import { api } from '../repositories/api'
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import LrTable from './LrTable.vue'

const activityBaseColumns = [
  {
    title: 'Num.',
    value: 'position'
  },
  {
    title: 'Cod.',
    value: 'code'
  },
  {
    title: 'Tipus',
    value: 'typeTitle'
  },
  {
    title: 'Descripció',
    value: 'description'
  },
  {
    title: 'Hores',
    value: 'hours'
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
  name: 'ActivityComponent',
  emits: ['saved'],
  props: {
    learningSituation: {
      type: Object,
      required: true
    },
    type: String
  },
  components: {
    ShowTable,
    LrTable,
    ModalComponent
  },
  computed: {
    ...mapState(useDataStore, ['module', 'activitiesData']),
    activityColumns() {
      const columns = [...activityBaseColumns]
      if (this.type === 'formative') {
        columns.push({
          title: 'Continguts',
          func: (x) => (x ? x?.map((item) => item.code).join(', ') : ''),
          param: 'didacticContents'
        })
      }
      return columns
    },
    learningResultsCheckeables() {
      return this.learningSituation.ponderedLearningResults?.map(item => {
        return {
          id: item.learningResult.id,
          number: item.learningResult.number,
          descriptor: item.learningResult.descriptor,
          evaluationCriterias: this.makeCheckeableArray(item.learningResult.evaluationCriterias, this.modalFields.evaluationCriterias)
        }
      })
    },
    evaluationCriteriasIdsSelected() {
      return this.learningResultsCheckeables
      .reduce((ecIds, lr) => ecIds.concat(this.getIDs(lr.evaluationCriterias
        .filter(item => item.checked))), [])
    },
    getActivityTitle() {
      return this.activityTypes.find((item) => item.type === this.type)?.title
    },
    activitiesOfType() {
      return this.learningSituation.activities
        ?.filter((item) => item.type === this.type)
        .map((item) => {
          return {
            ...item,
            typeTitle: this.activityTypes.find((aT) => aT.type === item.type)?.title || ''
          }
        })
    },
    didacticContents() {
      return this.makeCheckeableArray(this.learningSituation.didacticContents, this.modalFields.didacticContents)
    }
  },
  data() {
    return {
      editing: false,
      showActivityDetails: false,
      didacticContentsColumns,
      errors: [],
      activityTypes: [
        {
          type: 'deepening',
          title: 'Aprofundiment'
        },
        {
          type: 'formative',
          title: 'Formativa'
        },
        {
          type: 'marking',
          title: 'Qualificable'
        },
        {
          type: 'reinforcement',
          title: 'Reforç'
        }
      ],
      // Modal generic
      GenericModal: null,
      modalFields: {
          didacticContents: [],
          evaluationCriterias: [],
          assessmentTool: {},
          markingTool: {}
        },
      modalTitle: ''
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    getIDs(array) {
      return array?.map((item) => item.id) || []
    },
    makeCheckeableArray(array, selected) {
      if (!array || !array.length) return []
      return array.map(item => {
        return {
          ...item,
          checked: (typeof selected[0] === 'object') 
            ? this.getIDs(selected).includes(item.id) || false
            : this.selected?.includes(item.id) || false
        }
      })
    },
    showModal(activity) {
      if (activity.id) {
        this.editing = true
        this.modalTitle = 'Editar activitat - ' + this.getActivityTitle
        this.modalFields = { ...activity }
      } else {
        this.editing = false
        this.modalTitle = 'Nova activitat - ' + this.getActivityTitle
        this.modalFields = {
          didacticContents: [],
          evaluationCriterias: [],
          assessmentTool: {},
          markingTool: {}
        }
      }
      this.GenericModal = new Modal(document.getElementById(`${this.type}Activities`))
      this.GenericModal.show()
    },
    async saveActivity() {
      const activity = {
        hours: this.modalFields.hours,
        description: this.modalFields.description
      }
      if (this.editing) {
        activity.activityId = this.modalFields.id
        activity.position = this.modalFields.position
      } else {
        activity.position =
          this.activitiesOfType.reduce((max, item) => Math.max(max, item.position), 0) + 1
      }
      if (this.type === 'formative') {
        activity.didacticContentsIds = this.getIDs(
          this.didacticContents.filter((item) => item.checked)
        )
      }
      if (this.type === 'marking') {
        activity.assessmentToolId = this.modalFields.assessmentTool.id
        activity.markingToolId = this.modalFields.markingTool.id
        activity.evaluationCriteriaIds = this.evaluationCriteriasIdsSelected

        this.showActivityDetails = false
      }
      try {
        await api.saveActivity(this.learningSituation.id, this.type, activity)
        this.GenericModal.hide()
        this.addMessage('success', 'Activitat guardada')
        this.$emit('saved')
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async delActivity(activity) {
      if (
        confirm(
          "ATENCIÓ: Vas a esborrar l'activitat " +
            activity.code +
            '. Aquest procés NO es por des-fer !!!'
        )
      ) {
        try {
          await api.deleteActivity(this.learningSituation.id, activity.id)
          this.addMessage('success', 'Activitat eliminada')
          this.$emit('saved')
        } catch (error) {
          this.addMessage('error', error)
        }
      }
    },
  }
}
</script>

<template>
  <div class="bordered">
    <ModalComponent @save="saveActivity" :title="modalTitle" :modalId="type + 'Activities'">
      <div v-if="editing" class="row g-3 align-items-center">
        <div class="col-auto">
          <label class="form-label">Codi</label>
        </div>
        <div class="col-auto">
          <input type="text" v-model="modalFields.code" disabled />
        </div>
      </div>
      <div v-if="editing" class="row g-3 align-items-center">
        <div class="col-auto">
          <label class="form-label">Posició</label>
        </div>
        <div class="col-auto">
          <input type="number" v-model.number="modalFields.position" />
        </div>
      </div>
      <div class="row g-3 align-items-center">
        <div class="col-auto">
          <label class="form-label">Descripció</label>
        </div>
        <div class="col-auto">
          <input type="text" v-model="modalFields.description" />
        </div>
        <div class="col-auto">
          <span v-if="errors.description" class="error">{{ errors.description }}</span>
        </div>
      </div>
      <div class="row g-3 align-items-center">
        <div class="col-auto">
          <label class="form-label">Hores</label>
        </div>
        <div class="col-auto">
          <input type="text" v-model.number="modalFields.hours" />
        </div>
        <div class="col-auto">
          <span v-if="errors.hours" class="error">{{ errors.hours }}</span>
        </div>
      </div>
      <div v-if="type === 'formative'" class="row align-items-center">
        <label class="form-label">Continguts didàctics:</label>

        <ShowTable
          :checkeable="true"
          :actions="false"
          :data="didacticContents"
          :columns="didacticContentsColumns"
        ></ShowTable>
      </div>
      <div v-if="type === 'marking'">
        <div class="row g-3 align-items-center">
          <div class="col-auto">
            <label class="form-label">Tècnica</label>
          </div>
          <div class="col-auto">
            <select v-model="modalFields.assessmentTool.id">
              <option value="undefined">--- Selecciona ---</option>
              <option
                v-for="assessmentTool in activitiesData.assessmentTool"
                :key="assessmentTool.id"
                :value="assessmentTool.id"
              >
                {{ assessmentTool.name }}
              </option>
            </select>
          </div>
          <div class="col-auto">
            <span v-if="errors.description" class="error">{{ errors.description }}</span>
          </div>
        </div>
        <div class="row g-3 align-items-center">
          <div class="col-auto">
            <label class="form-label">Instrument</label>
          </div>
          <div class="col-auto">
            <select v-model="modalFields.markingTool.id">
              <option value="undefined">--- Selecciona ---</option>
              <option
                v-for="markingTool in activitiesData.markingTool"
                :key="markingTool.id"
                :value="markingTool.id"
              >
                {{ markingTool.name }}
              </option>
            </select>

          </div>
          <div class="col-auto">
            <span v-if="errors.description" class="error">{{ errors.description }}</span>
          </div>
        </div>
        <div class="row align-items-center">
          <label class="form-label">Resultats d'Aprenentatge amb Criteris d'avaluació:</label>
            <lr-table
            :checkeable="true"
  :actions="false"
  :learningResults="learningResultsCheckeables"
            ></lr-table>
        </div>
      </div>
    </ModalComponent>
    <show-table :data="activitiesOfType" :columns="activityColumns">
      <template v-slot="{ item, index }">
        <button @click="showActivityDetails = item" class="btn btn-secondary" title="Veure">
          <i class="bi bi-eye"></i>
        </button>
        <button @click="showModal(item)" class="btn btn-secondary" title="Editar">
          <i class="bi bi-pencil"></i>
        </button>
        <button @click="delActivity(item, index)" class="btn btn-secondary" title="Eliminar">
          <i class="bi bi-trash"></i>
        </button>
      </template>
    </show-table>
    <div v-if="showActivityDetails" class="bordered">
      <h5>
        Detalls de l'activitat {{ showActivityDetails.code }}
        <button
          @click="showActivityDetails = false"
          class="btn btn-secondary"
          title="Amagar detalls"
        >
          <i class="bi bi-eye-slash"></i>
        </button>
      </h5>
      <h6>Criteris d'avaluació</h6>
      <p
        v-for="evaluationCriteria in showActivityDetails.evaluationCriterias"
        :key="evaluationCriteria.id"
      >
        <strong>{{ evaluationCriteria.code }} - </strong>{{ evaluationCriteria.description }}
      </p>
      <p>
        <strong>Tècnica: </strong>
        {{ showActivityDetails.assessmentTool.name }}
      </p>
      <p>
        <strong>Instriment: </strong>
        {{ showActivityDetails.markingTool.name }}
      </p>
    </div>
    <button type="button" class="btn btn-secondary" title="Afegir activitat" @click="showModal">
      Afegir nova activitat
    </button>
  </div>
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
