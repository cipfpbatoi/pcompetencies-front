<script>
import ShowTable from './ShowTable.vue'
import { useDataStore } from '@/stores/data'
import { mapState, mapActions } from 'pinia'
import { api } from '../repositories/api'
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import LrTable from './LrTable.vue'
import { validateFormErrors, makeCheckeableArray, getObjectsIds } from '../utils/utils.js'
import * as yup from 'yup'
import { object } from 'yup'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

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
    value: 'description',
    html: true
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
  async mounted() {
    if (this.type === 'marking') {
      try {
        this.syllabusMarkingActivities = this.learningSituation.activities.filter(
          (item) => item.type === 'marking'
        )
        console.log(this.syllabusMarkingActivities)
      } catch (error) {
        this.addMessage('error', error)
      }
    }
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'module', 'activitiesData']),
    activityColumns() {
      const columns = [...activityBaseColumns]
      if (this.type === 'formative') {
        columns.push({
          title: 'Continguts',
          func: (x) => (x ? x?.map((item) => item.code).join(', ') || '---' : '---'),
          param: 'didacticContents'
        })
      }
      if (this.type === 'marking') {
        columns.push({
          title: 'C.A.',
          hint: 'Criteris d\'avaluació associats',
          func: (x) => (x ? x?.map((item) => item.code).join(', ') || '---' : '---'),
          param: 'evaluationCriterias'
        })
      }
      return columns
    },
    moduleEcWithLr() {
      return this.module?.learningResults.reduce(
        (lRs, lr) =>
          lRs.concat(
            lr.evaluationCriterias.map((ec) => {
              return {
                ...ec,
                lr: {
                  number: lr.number,
                  descrip: lr.descriptor
                }
              }
            })
          ),
        []
      )
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
      return makeCheckeableArray(
        this.learningSituation.didacticContents,
        this.modalFields.didacticContents
      )
    },
    evaluationCriteriasUsedInOtherLS() {
      if (this.type !== 'marking') return
      return this.syllabusMarkingActivities
        .filter((item) => item.id != this.learningSituation.id)
        .reduce(
          (totEcs, activity) =>
            totEcs.concat(activity.evaluationCriterias.reduce((ecs, ec) => ecs.concat(ec.id), [])),
          []
        )
    }
  },
  data() {
    return {
      editing: false,
      showActivityDetails: false,
      didacticContentsColumns,
      learningResultsCheckeables: [],
      syllabusMarkingActivities: [],
      errors: {},
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
      modalTitle: '',
      // CKEditor
      editor: ClassicEditor,
      editorConfig: {
        // The configuration of the editor.
      }
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    createValidationSchema() {
      let validationSchema = object({
        contents: yup.array().min(1, 'Has d\'incloure al menys 1 contingut'),
        description: yup
          .string()
          .trim()
          .required('Has de posar una descripció de al menys 10 caracters')
          .min(10, 'Has de posar una descripció de al menys 10 caracters')
      })
        .when((values, schema) => {
          if (this.editing) {
            return schema.shape({
              position: yup
                .number('La posició ha de ser un número positiu')
                .required('La posició ha de ser un número positiu')
                .min(1, 'La posició ha de ser un número positiu')
            })
          }
        })
        .when((values, schema) => {
          if (this.type === 'formative') {
            return schema.shape({
              hours: yup.number().required('Has d\'indicar les hores de la activitat')
            })
          }
        })
        .when((values, schema) => {
          if (this.type === 'marking') {
            return schema.shape({
              hours: yup.number().required('Has d\'indicar les hores de la activitat'),
              assessmentToolId: yup.number().required('Has d\'indicar la tàcnica d\'avaluació'),
              markingToolId: yup.number().required('Has d\'indicar l\'instrument de qualificació')
            })
          }
        })

      return validationSchema
    },
    generateActivityDetails(activity) {
      const details = {
        ...activity,
        learningResults: []
      }
      const ecWithLr = activity.evaluationCriterias.map((ec) => {
        return {
          ...ec,
          lr: this.moduleEcWithLr.find((item) => item.id === ec.id)?.lr
        }
      })
      ecWithLr.forEach((ec) => {
        if (details.learningResults['RA' + ec.lr.number]) {
          details.learningResults['RA' + ec.lr.number].evaluationCriterias.push({
            code: ec.code,
            description: ec.description,
            completeCode: ec.code + ',' + ec.lr.number
          })
        } else {
          details.learningResults['RA' + ec.lr.number] = {
            descrip: ec.lr.descrip,
            evaluationCriterias: [
              {
                code: ec.code,
                description: ec.description,
                completeCode: ec.code + ',' + ec.lr.number
              }
            ]
          }
        }
      })
      this.showActivityDetails = details
    },
    showModal(activity) {
      this.errors = []
      if (activity.id) {
        this.editing = true
        this.modalTitle = 'Editar activitat - ' + this.getActivityTitle
        this.modalFields = {
          ...activity
        }
        if (this.type === 'marking') {
          this.modalFields.assessmentToolId = activity.assessmentTool?.id
          this.modalFields.markingToolId = activity.markingTool?.id
          this.modalFields.aggregateEndBlock = activity.aggregateEndBlock
        }
      } else {
        this.editing = false
        this.modalTitle = 'Nova activitat - ' + this.getActivityTitle
        this.modalFields = {}
        if (this.type === 'marking') {
          this.modalFields.didacticContents = []
          this.modalFields.evaluationCriterias = []
          this.modalFields.aggregateEndBlock = activity.aggregateEndBlock
        }
      }
      if (this.type === 'marking') {
        let evaluationCriteriasUsedInThisLS = []
        this.learningSituation.activities
            .filter((item) => item.type === 'marking' && item.id != this.modalFields.id)
            .forEach(activ => activ.evaluationCriterias
              .forEach(ec => evaluationCriteriasUsedInThisLS.push(ec.id)))
        const evaluationCriteriasUsed = Array.from(
          new Set(evaluationCriteriasUsedInThisLS.concat(this.evaluationCriteriasUsedInOtherLS))
        )
        this.learningResultsCheckeables =
          this.learningSituation.ponderedLearningResults?.map((item) => {
            return {
              id: item.learningResult.id,
              number: item.learningResult.number,
              descriptor: item.learningResult.descriptor,
              evaluationCriterias: makeCheckeableArray(
                item.learningResult.evaluationCriterias.map((item) => {
                  return {
                    ...item,
                    success: evaluationCriteriasUsed.includes(item.id)
                  }
                }),
                this.modalFields.evaluationCriterias
              )
            }
          }) || []
      }
      this.GenericModal = new Modal(document.getElementById(`${this.type}Activities`))
      this.GenericModal.show()
    },
    async saveActivity() {
      this.errors = await validateFormErrors(this.createValidationSchema(), this.modalFields)
      // Extra validations
      let didacticContentsIdsSelected = []
      if (this.type === 'formative') {
        didacticContentsIdsSelected = getObjectsIds(
          this.didacticContents.filter((item) => item.checked)
        )
        if (!didacticContentsIdsSelected.length) {
          this.errors.didacticContents = 'Has de marcar al menys 1 contingut'
        }
      }
      let evaluationCriteriasIdsSelected = []
      if (this.type === 'marking') {
        evaluationCriteriasIdsSelected = this.learningResultsCheckeables.reduce(
          (ecIds, lr) =>
            ecIds.concat(getObjectsIds(lr.evaluationCriterias.filter((item) => item.checked))),
          []
        )
        if (!evaluationCriteriasIdsSelected.length) {
          this.errors.evaluationCriterias = 'Has de marcar al menys 1 criteri d\'avaluació'
        }
      }
      if (['formative', 'marking'].includes(this.type)) {
        const totActivHours = this.learningSituation.activities
          .filter((item) => item.id != this.modalFields.id)
          .reduce((total, item) => total + (item.hours || 0), 0)
        if (totActivHours + this.modalFields.hours > this.learningSituation.hours) {
          this.errors.hours =
            'Te\'n pases d\'hores. La resta d\'activitats ja sumen ' +
            totActivHours +
            ' de les ' +
            this.learningSituation.hours +
            ' hores de la situació d\'aprenentatge'
        }
      }
      if (Object.keys(this.errors).length) return

      const activity = {
        description: this.modalFields.description
      }
      if (this.editing) {
        const position = this.modalFields.position
        if (!position || isNaN(position) || position < 1) {
          this.errors.position = 'La posició ha de ser un número positiu'
          return
        }
        activity.activityId = this.modalFields.id
        activity.position = this.modalFields.position
      } else {
        activity.position =
          this.activitiesOfType.reduce((max, item) => Math.max(max, item.position), 0) + 1
      }
      if (this.type === 'formative') {
        activity.hours = this.modalFields.hours
        activity.didacticContentsIds = didacticContentsIdsSelected
      }
      if (this.type === 'marking') {
        activity.hours = this.modalFields.hours
        activity.assessmentToolId = this.modalFields.assessmentToolId
        activity.markingToolId = this.modalFields.markingToolId
        activity.evaluationCriteriaIds = evaluationCriteriasIdsSelected
        activity.aggregateEndBlock = this.modalFields.aggregateEndBlock
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
          'ATENCIÓ: Vas a esborrar l\'activitat ' +
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
    }
  }
}
</script>

<template>
  <div class="bordered border-primary-subtle mt-0">
    <ModalComponent @save="saveActivity" :title="modalTitle" :modalId="type + 'Activities'">
      <div v-if="editing" class="row p-1 align-items-center">
        <label class="col-sm-2 col-form-label fw-bold">Codi</label>
        <div class="col-sm-4">
          <input type="text" class="form-control" v-model="modalFields.code" disabled />
        </div>
      </div>
      <div v-if="editing" class="row p-1 align-items-center">
        <label class="col-sm-2 col-form-label fw-bold">Posició</label>
        <div class="col-sm-4">
          <input class="form-control" type="number" v-model.number="modalFields.position" />
        </div>
        <div class="col-auto">
          <span v-if="errors.position" class="error">{{ errors.position }}</span>
        </div>
      </div>
      <div class="row p-1 align-items-center">
        <label class="col-sm-3 col-form-label fw-bold">Descripció del tipus d'activitat</label>
        <div class="col-md-9 col-sm-12">
          <textarea class="form-control border-secondary" v-model="modalFields.description" rows="3"></textarea>
          <p v-if="errors.description" class="error">{{ errors.description }}</p>
        </div>
      </div>
      <div v-if="['formative', 'marking'].includes(type)" class="row align-items-center">
        <label class="col-sm-3 col-form-label fw-bold">Hores</label>
        <div class="col-lg-4 col-sm-10">
          <input type="number" v-model.number="modalFields.hours" />
          <span v-if="errors.hours" class="error">{{ errors.hours }}</span>
        </div>
      </div>
      <div v-if="type === 'formative'" class="row align-items-center">
        <h2 class="form-label m-2">Continguts didàctics:</h2>
        <ShowTable
          class="p-4 bg-info-subtle"
          :checkeable="true"
          :actions="false"
          :data="didacticContents"
          :columns="didacticContentsColumns"
        ></ShowTable>
        <div class="col-auto">
          <span v-if="errors.didacticContents" class="error">{{ errors.didacticContents }}</span>
        </div>
      </div>
      <div v-if="type === 'marking'">
        <div class="form-group row p-1">
          <label class="col-sm-3 col-form-label fw-bold">Tècnica / Instrument Avaluació</label>
          <div class="col-lg-4 col-sm-10">
            <select class="form-control custom-select col-12" v-model="modalFields.assessmentToolId">
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
            <span v-if="errors.assessmentToolId" class="error">{{ errors.assessmentToolId }}</span>
          </div>
        </div>
        <div class="form-group row p-1">
          <label class="col-sm-3 col-form-label fw-bold">Instrument Qualificació</label>
          <div class="col-lg-4 col-sm-10">
            <select class="form-control custom-select col-12" v-model="modalFields.markingToolId">
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
            <span v-if="errors.markingToolId" class="error">{{ errors.markingToolId }}</span>
          </div>
        </div>
        <div class="row p-1 bg-secondary-subtle">
          <p class="p-2 text-center"><input type="checkbox" v-model.number="modalFields.aggregateEndBlock">
            Temporalitzar hores al final del bloc (Sols s'aplicarà si la SA pertany a un bloc formatiu)</p>
        </div>
        <div class="row align-items-center">
          <p class="form-label m-1 mt-3 fw-bold">
            Resultats d'Aprenentatge amb Criteris d'avaluació:
          </p>
          <lr-table
            class="p-4 bg-info-subtle"
            :checkeable="true"
            :actions="false"
            :learningResults="learningResultsCheckeables"
          ></lr-table>
        </div>
      </div>
    </ModalComponent>
    <show-table :data="activitiesOfType" :columns="activityColumns">
      <template v-slot="{ item, index }">
        <button
          v-if="type === 'marking'"
          @click="generateActivityDetails(item)"
          class="btn btn-secondary"
          title="Veure"
        >
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
      <p v-for="lr in Object.keys(showActivityDetails.learningResults)" :key="lr">
        {{ lr }}: {{ showActivityDetails.learningResults[lr].descrip }}<br>
        <span
          v-for="evaluationCriteria in showActivityDetails.learningResults[lr].evaluationCriterias"
          :key="evaluationCriteria.id"
        >
          - <strong>{{ evaluationCriteria.code }})</strong>
          {{ evaluationCriteria.description }} <br /></span>
      </p>
      <p>
        <strong>Tècnica Aval.: </strong>
        {{ showActivityDetails.assessmentTool.name }}
      </p>
      <p>
        <strong>Instrument Qual.: </strong>
        {{ showActivityDetails.markingTool.name }}
      </p>
    </div>
    <div class="text-center">
      <button type="button" class="btn btn-success" title="Afegir activitat" @click="showModal">
        Afegir nova activitat
      </button>
    </div>
  </div>
</template>

<style scoped>
.error {
  color: red;
}
</style>
<style>
.ck-editor__editable {
  min-height: 150px !important;
}
</style>
