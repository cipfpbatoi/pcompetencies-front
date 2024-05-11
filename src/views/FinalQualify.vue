<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import ShowTable from '@/components/ShowTable.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { validateFormErrors, makeCheckeableArray, getObjectsIds } from '../utils/utils.js'
import LrTable from '@/components/LrTable.vue'
import * as yup from 'yup'
import { object } from 'yup'

const activityColumns = [
  {
    title: 'Id',
    value: 'id'
  },
  {
    title: 'Cod.',
    value: 'code'
  },
  {
    title: 'Descripció',
    value: 'description',
    html: true
  },
  {
    title: 'Tècnica',
    func: (x) => x.name,
    param: 'assessmentTool'
  },
  {
    title: '%',
    func: (x) =>
      x
        ? x?.map((lr) => `RA${lr.learningResult.number}: ${lr.percentageWeight}%`).join('<br>') ||
          '---'
        : '---',
    param: 'ponderedLearningResults',
    html: true
  },
  {
    title: 'C.A.',
    hint: "Criteris d'avaluació associats",
    func: (x) =>
      x
        ? x
            ?.map(
              (lr) =>
                `RA${lr.learningResult.number}: ` +
                lr.evaluationCriterias.map((ec) => ec.code).join(', ')
            )
            .join('<br>') || '---'
        : '---',
    param: 'ponderedLearningResults',
    html: true
  }
]

const validationSchemaBase = object({
  contents: yup.array().min(1, "Has d'incloure al menys 1 contingut"),
  description: yup
    .string()
    .trim()
    .required('Has de posar una descripció de al menys 10 caracters')
    .min(10, 'Has de posar una descripció de al menys 10 caracters'),
  assessmentToolId: yup.number().required("Has d'indicar la tàcnica d'avaluació"),
  markingToolId: yup.number().required("Has d'indicar l'instrument de qualificació")
})

export default {
  components: {
    AppBreadcrumb,
    ShowTable,
    ModalComponent,
    LrTable
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'module', 'activitiesData']),
    qualificationsSummaryColumns() {
      const columns = this.syllabusFinalActivities.map((activ) => {
        return {
          title: `${activ.code}<br>(${activ.assessmentTool.name})`,
          value: activ.code
        }
      })
      columns.unshift({
        title: '',
        value: 'ra',
        html: true
      })
      columns.push({
        title: 'Total RA',
        value: 'totalRa'
      })
      columns.push({
        title: 'Total curs',
        value: 'total'
      })
      return columns
    },
    qualificationsSummaryData() {
      if (!this.syllabusFinalActivities.length) return []
      const data = []
      this.syllabusPonderedLearningResults?.forEach((lr) => {
        const row = {
          ra: '<strong>RA' + lr.number + '</strong>'
        }
        let totalPercentageWeight = 0
        this.syllabusFinalActivities.forEach((activ) => {
          const percentageWeight =
            this.activitiesPonderedLearningResults['RA' + lr.number][activ.code]
          if (percentageWeight) {
            row[activ.code] = percentageWeight + ' %'
            totalPercentageWeight += percentageWeight
          } else {
            row[activ.code] = '---'
          }
        })
        row.totalRa = totalPercentageWeight + ' %'
        row.total = lr.syllabusPercentageWeight + ' %'
        data.push(row)
      })
      return data
    },
    totalRa() {
      return this.qualificationsSummaryData.some((ra) => ra.totalRa !== '100 %')
    },
    activitiesPonderedLearningResults() {
      const aPLR = {}
      this.syllabusPonderedLearningResults?.forEach((lr) => {
        aPLR['RA' + lr.number] = {}
      })
      this.syllabusFinalActivities.forEach((activ) => {
        activ.ponderedLearningResults.forEach((lr) => {
          aPLR['RA' + lr.learningResult.number][activ.code] = lr.percentageWeight
        })
      })
      return aPLR
    },
    syllabusPonderedLearningResults() {
      const sPLR = this.module.learningResults?.map((item) => {
        return {
          id: item.id,
          number: item.number,
          descriptor: item.descriptor,
          evaluationCriterias: item.evaluationCriterias,
          syllabusPercentageWeight: 0
        }
      })
      // Posem la ponderació de cada LR
      this.syllabus.learningSituations?.forEach((ls) =>
        ls.ponderedLearningResults.forEach((lr) => {
          const lrStored = sPLR.find((item) => item.id === lr.learningResult.id)
          lrStored.syllabusPercentageWeight += lr.percentageWeight
        })
      )
      return sPLR
    }
  },
  async mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
    try {
      const response = await api.getFinalActivities(this.syllabus.id)
      this.syllabusFinalActivities = response.data.activities || []
      this.lsLoaded = true
    } catch (error) {
      this.addMessage('error', error)
    }
    this.GenericModal = new Modal(document.getElementById('finalActivities'))
  },
  data() {
    return {
      editing: false,
      showActivityDetails: false,
      learningResultsCheckeables: [],
      syllabusFinalActivities: [],
      activityColumns,
      errors: {},
      // Modal generic
      GenericModal: null,
      modalId: '',
      modalFields: {},
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
    showModal(activity) {
      this.errors = []
      if (activity.id) {
        this.editing = true
        this.modalTitle = 'Editar activitat ' + activity.code
        this.modalFields = {
          ...activity,
          assessmentToolId: activity.assessmentTool?.id,
          markingToolId: activity.markingTool?.id,
          learningResults: this.syllabusPonderedLearningResults
        }
        activity.ponderedLearningResults.forEach(
          (lr) => (this.modalFields['RA' + lr.learningResult.number] = lr.percentageWeight)
        )
      } else {
        this.editing = false
        this.modalTitle = 'Nova activitat de recuperació'
        this.modalFields = {
          learningResults: []
        }
      }
      const evaluationCriteriasUsed = this.syllabusFinalActivities
        .filter((item) => item.id != this.modalFields.id)
        .reduce(
          (totalEvaluationCriterias, activity) =>
            activity.ponderedLearningResults.reduce(
              (tot, lr) =>
                totalEvaluationCriterias.concat(lr.evaluationCriterias.map((ec) => ec.id)),
              []
            ),
          []
        )
      this.learningResultsCheckeables =
        this.syllabusPonderedLearningResults.map((item) => {
          return {
            ...item,
            percentageWeight: this.modalFields['RA' + item.number] || 0,
            evaluationCriterias: makeCheckeableArray(
              item.evaluationCriterias.map((item) => {
                return {
                  ...item,
                  success: evaluationCriteriasUsed.includes(item.id)
                }
              }),
              this.editing
                ? activity.ponderedLearningResults.reduce(
                    (totEC, lr) => totEC.concat(lr.evaluationCriterias.map((ec) => ec.id)),
                    []
                  )
                : []
            )
          }
        }) || []
      this.GenericModal.show()
    },
    async saveActivity() {
      this.errors = {}
      const validationSchema = validationSchemaBase.when((values, schema) => {
        if (this.editing) {
          return schema.shape({
            position: yup
              .number('La posició ha de ser un número positiu')
              .required('La posició ha de ser un número positiu')
              .min(1, 'La posició ha de ser un número positiu')
          })
        }
      })
      this.errors = await validateFormErrors(validationSchema, this.modalFields)
      // Extra validations
      const ponderedLearningResultsToSave = []
      this.learningResultsCheckeables.forEach((lr) => {
        const percentageWeight = this.modalFields['RA' + lr.number]
        const ecIds = lr.evaluationCriterias.filter((ec) => ec.checked).map((ec) => ec.id)
        if (ecIds.length) {
          ponderedLearningResultsToSave.push({
            learningResultId: lr.id,
            percentageWeight: percentageWeight,
            evaluationCriteriaIds: ecIds
          })
          if (!percentageWeight) {
            const error =
              'RA' +
              lr.number +
              ": has marcat criteris d'avaluació però has deixat la seua ponderació a 0%<br>"
            if (this.errors.ponderedLearningResults) {
              this.errors.ponderedLearningResults += error
            } else {
              this.errors.ponderedLearningResults = error
            }
          }
        } else if (percentageWeight) {
          const error =
            'RA' +
            lr.number +
            ": li has donat pes a aquest RA però no has marcat cap criteri d'avaluació<br>"
          if (this.errors.ponderedLearningResults) {
            this.errors.ponderedLearningResults += error
          } else {
            this.errors.ponderedLearningResults = error
          }
        }
      })

      if (!ponderedLearningResultsToSave.length) {
        const error = "Has de marcar al menys 1 criteri d'avaluació"
        if (this.errors.ponderedLearningResults) {
          this.errors.ponderedLearningResults += error
        } else {
          this.errors.ponderedLearningResults = error
        }
      }

      if (Object.keys(this.errors).length) return

      try {
        const activityToSave = {
          position: this.modalFields.position,
          description: this.modalFields.description,
          assessmentToolId: this.modalFields.assessmentToolId,
          markingToolId: this.modalFields.markingToolId,
          ponderedLearningResults: ponderedLearningResultsToSave
        }
        if (this.editing) {
          activityToSave.activityId = this.modalFields.id
        } else {
          activityToSave.position =
            this.syllabusFinalActivities.reduce((max, item) => Math.max(max, item.position), 0) + 1
        }
        const response = await api.saveFinalActivity(this.syllabus.id, activityToSave)
        this.syllabusFinalActivities = response.data.activities
        this.modalFields = {}
        this.GenericModal.hide()
        this.addMessage('success', 'Activitat guardada')
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    changeRAWeight(lrChanged) {
      this.modalFields['RA' + lrChanged.number] = lrChanged.percentageWeight
    },
    async delActivity(activity, index) {
      if (
        confirm(
          "ATENCIÓ: Vas a esborrar l'activitat " +
            activity.code +
            '. Aquest procés NO es por des-fer !!!'
        )
      ) {
        try {
          await api.deleteFinalActivity(this.syllabus.id, activity.id)
          this.addMessage('success', 'Activitat eliminada')
          this.syllabusFinalActivities.splice(index, 1)
        } catch (error) {
          this.addMessage('error', error)
        }
      }
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <ModalComponent @save="saveActivity" :title="modalTitle" modalId="finalActivities">
      <div v-if="editing" class="row p-1 align-items-center">
        <label class="col-sm-2 col-form-label fw-bold">Posició</label>
        <div class="col-sm-4">
          <input class="form-control" type="number" v-model.number="modalFields.position" />
        </div>
        <div class="col-auto">
          <span class="text-danger" v-if="errors.position">{{ errors.position }}</span>
        </div>
      </div>
      <div class="row p-1 align-items-center form-group mb-3">
        <label class="col-sm-12 col-form-label fw-bold">Descripció de l'Activitat</label>
        <div class="col-sm-12">
          <ckeditor
            :editor="editor"
            v-model="modalFields.description"
            :config="editorConfig"
          ></ckeditor>
          <p class="text-danger" v-if="errors.description">{{ errors.description }}</p>
        </div>
      </div>
      <div class="form-group row p-1">
        <label class="col-sm-2 col-form-label fw-bold">Tècnica</label>
        <div class="col-4">
          <select class="form-control custom-select" v-model="modalFields.assessmentToolId">
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
          <span class="text-danger" v-if="errors.assessmentToolId">{{
            errors.assessmentToolId
          }}</span>
        </div>
      </div>
      <div class="form-group row p-1">
        <label class="col-sm-2 col-form-label fw-bold">Instrument</label>
        <div class="col-auto col-4">
          <select class="form-control custom-select" v-model="modalFields.markingToolId">
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
          <span class="text-danger" v-if="errors.markingToolId">{{ errors.markingToolId }}</span>
        </div>
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
          percentageWeight="edit"
          @changeWeigth="changeRAWeight"
        ></lr-table>
        <div class="col-auto">
          <span
            class="text-danger"
            v-if="errors.ponderedLearningResults"
            v-html="errors.ponderedLearningResults"
          ></span>
        </div>
      </div>
    </ModalComponent>
    <app-breadcrumb :actualStep="9" :done="true"></app-breadcrumb>
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }}) - {{ syllabus.courseYear }}</h2>
      <h2>9. Qualificació Final</h2>
      <h3>Activitats de Qualificació</h3>
      <div class="border border-black">
        <show-table :data="syllabusFinalActivities" :columns="activityColumns">
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
          <p v-for="lr in showActivityDetails.ponderedLearningResults" :key="lr.id">
            <strong>RA{{ lr.learningResult.number }}: {{ lr.learningResult.descriptor }}</strong>
            <template v-for="ec in lr.evaluationCriterias" :key="ec.id">
              <br /><span>- {{ ec.code }}) {{ ec.description }}</span>
            </template>
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
      </div>
      <button type="button" class="btn btn-secondary" title="Afegir activitat" @click="showModal">
        Afegir nova activitat
      </button>
      <br />
    </div>
    <div class="p-lg-4 p-1 p-sm-0">
      <h4>Resum d'activitats</h4>
      <div class="bg-danger m-1">
        <p v-if="totalRa" class="text-light p-2 text-justify">
          <strong>ATENCIÓ:</strong> la suma dels percentatges de cada RA hauria de ser el 100%. Has
          d'arreglar-lo
        </p>
      </div>
      <div class="border border-black">
        <show-table
          :actions="false"
          :columns="qualificationsSummaryColumns"
          :data="qualificationsSummaryData"
        >
        </show-table>
      </div>
    </div>
  </main>
</template>
