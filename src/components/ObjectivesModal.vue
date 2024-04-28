<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import * as yup from 'yup'
import { object } from 'yup'
import ShowTable from './ShowTable.vue'
import LrTable from './LrTable.vue'
import { makeCheckeableArray, getObjectsIds, validateFormErrors } from '../utils/utils.js'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

const generalObjectivesColumns = [
  {
    title: 'Codi',
    value: 'code'
  },
  {
    title: 'Descripció',
    value: 'description'
  }
]

const validationSchema = object({
  didacticObjectives: yup
    .string()
    .trim()
    .required('Has de posar els objectius')
    .min(20, 'Al menys han de tindre 20 caracters')
})

export default {
  emits: ['saved'],
  components: {
    ShowTable,
    LrTable
  },
  props: {
    unit: Object
  },
  mounted() {
    this.didacticObjectives = this.unit?.didacticObjectives || ''
  },
  computed: {
    ...mapState(useDataStore, ['syllabus']),
    generalObjectives() {
      return makeCheckeableArray(this.syllabus.moduleCycleObjectives, this.unitGeneralObjectivesIds)
    },
    unitGeneralObjectivesIds() {
      return this.unit.generalObjectives?.map((item) => item.id)
    },
    formattedLearningResults() {
      return (
        this.unit.ponderedLearningResults?.map((item) => {
          return {
            id: item.id,
            percentageWeight: item.percentageWeight,
            number: item.learningResult.number,
            descriptor: item.learningResult.descriptor,
            evaluationCriterias: item.learningResult.evaluationCriterias
          }
        }) || []
      )
    }
  },
  data() {
    return {
      didacticObjectives: this.unit?.didacticObjectives || 'sdf',
      errors: {},
      generalObjectivesColumns,
      // CKEditor
      editor: ClassicEditor,
      editorConfig: {
        // The configuration of the editor.
      }
    }
  },
  methods: {
    ...mapActions(useDataStore, ['saveLearningSituationObjectives']),
    async save() {
      this.errors = await validateFormErrors(validationSchema, {
        didacticObjectives: this.didacticObjectives
      })
      if (Object.keys(this.errors).length) return

      const response = await this.saveLearningSituationObjectives(this.unit.id, {
        didacticObjectives: this.didacticObjectives,
        generalObjectivesIds: getObjectsIds(this.generalObjectives.filter((item) => item.checked))
      })
      if (response === 'ok') {
        this.$emit('saved')
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
  <!-- Modal -->
  <div
    class="modal fade"
    id="objectivesModalComp"
    tabindex="-1"
    aria-labelledby="unit-modal"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-darkgrey">
          <h1 class="modal-title fs-5" id="unit-modal">{{ unit.position }}: {{ unit.title }}</h1>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <div class="row">
            <div class="cols-6">
              <h5 class="form-label">Objectius generals</h5>
              <!-- Tabla de objetivos generales-->
              <div>
                <ShowTable
                  :checkeable="true"
                  :actions="false"
                  :data="generalObjectives"
                  :columns="generalObjectivesColumns"
                >
                </ShowTable>
              </div>
              <!-- Fin tabla -->
            </div>
            <div class="cols-6">
              <h5 class="form-label">Objectius didàctics</h5>
              <ckeditor
                :editor="editor"
                v-model="didacticObjectives"
                :config="editorConfig"
              ></ckeditor>
              <textarea class="form-control" v-model="didacticObjectives"></textarea>
              <span v-if="errors.didacticObjectives" class="error">{{
                errors.didacticObjectives
              }}</span>
            </div>
            <div>
              <br />
              <h6>Resultats d'Aprenentatge i Criteris d'Avaluació</h6>
              <lr-table :learningResults="formattedLearningResults" :percentageWeight="true">
              </lr-table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tanca</button>
          <button @click="save" type="button" class="btn btn-secondary">Guarda</button>
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error {
  color: red;
}
</style>
