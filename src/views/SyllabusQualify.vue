<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import ShowTable from '@/components/ShowTable.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'

const activityColumns = [
  {
    title: 'R.A.',
    func: (x) => x.map((ra) => `RA${ra.number} (${ra.percentageWeight}%)`).join('<br>'),
    param: 'ras',
    html: true
  },
  {
    title: 'Codi',
    value: 'code'
  },
  {
    title: "Criteri d'avaluació a utilitzar",
    func: (x) => x.map((ra) => `RA${ra.number} ` + ra.ecs.map(ec => ec.code).join(', ')).join('<br>'),
    param: 'ras',
    html: true
  },
  {
    title: 'SA (%)',
    func: (x) => x + ' %',
    param: 'percentageWeight'
  },
  {
    title: 'Curs (%)',
    value: 'hours'
  },
  {
    title: 'Fonamental',
    value: 'fundamental'
  }
]

export default {
  components: {
    AppBreadcrumb,
    ShowTable,
    ModalComponent
  },
  computed: {
    ...mapState(useDataStore, ['syllabus']),
    learningSituationsToShow() {
      if (!this.syllabus.learningSituations
        || !this.sylMarkingActivities.length) return []
      const learningSituations = []
      this.syllabus.learningSituations.forEach((ls) => {
        const learningSituation = {
          id: ls.id,
          position: ls.position,
          hours: ls.hours,
          title: ls.title
        }
        const activities = this.sylMarkingActivities.filter(
          (item) => item.learningSituation.id === ls.id
        )
        learningSituation.activities = activities.map((item) => {
          return {
            id: item.id,
            code: item.code,
            positiom: item.position,
            hours: item.hours,
            percentageWeight: item.percentageWeight,
            fundamental: item.fundamental,
            ecs: this.getRAData(item),
            ras: ls.ponderedLearningResults.map((lr) => {
              return {
                id: lr.learningResult.id,
                percentageWeight: lr.percentageWeight,
                number: lr.learningResult.number,
                ecs: item.evaluationCriterias
                  .filter(ec => ec.learningResult.id === lr.learningResult.id)
              }
            })
          }
        })
        learningSituation.totalPercentageWeight = learningSituation.activities.reduce(
          (total, act) => total + act.percentageWeight, 0)
        learningSituations.push(learningSituation)
      })
      return learningSituations
    }
  },
  async mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
    this.GenericModal = new Modal(document.getElementById('activityModal'))
    try {
      const response = await api.getSyllabusMarlingActivities(this.syllabus.id)
      this.sylMarkingActivities = response.data
      // this.generatesylMarkingActivitiesToShow(response.data)
    } catch (error) {
      this.addMessage('error', error)
    }
  },
  data() {
    return {
      itemToModify: '',
      activityColumns,
      sylMarkingActivities: [],
      sylMarkingActivitiesToShow: [],
      errors: {},
      // Modal generic
      GenericModal: null,
      modalId: '',
      modalFields: {},
      modalTitle: ''
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    showModal(activity) {
      this.modalFields = {
        activityId: activity.id,
        percentageWeight: activity.percentageWeight,
        fundamental: activity.fundamental
      }
      this.modalTitle = 'Modificar activitat ' + activity?.code
      this.GenericModal.show()
    },
    getActivitiesByLs(lsId) {
      return this.sylMarkingActivities
        .filter((item) => item.learningSituation.id === lsId)
        .map((act) => {
          return {
            ...act,
            RA: this.getRAData(act)
          }
        })
    },
    getRAData(activity) {
      const data = {}
      activity.evaluationCriterias.forEach((ec) => {
        if (!data['RA' + ec.learningResult.number]) {
          data['RA' + ec.learningResult.number] = {
            percentageWeight: 0,
            evaluationCriterias: []
          }
        }
        data['RA' + ec.learningResult.number].evaluationCriterias.push(ec.code)
      })
      return data
    },
    async saveActivity() {
      // Comprovacions
      try {
        const response = await api.saveSyllabusMarlingActivities(this.syllabus.id, {
          activities: [this.modalFields]
        })
        const index = this.sylMarkingActivities.findIndex((item) => item.id === response.data[0].id)
        this.sylMarkingActivities.splice(index, 1, response.data[0])
        this.modalFields = {}
        this.GenericModal.hide()
      } catch (error) {
        this.addMessage('error', error)
      }
    }
  }
}
</script>

<template>
  <main>
    <ModalComponent @save="saveActivity" :title="modalTitle" id="activityModal">
      <div class="input-group mb-3">
        <span class="input-group-text">Pes:</span>
        <input
          type="number"
          size="3"
          min="0"
          max="100"
          class="form-control"
          v-model="modalFields.percentageWeight"
        />
        %
        <span v-if="errors.percentageWeight" class="input-group-text text-danger">{{
            errors.percentageWeight
          }}</span>
      </div>
      <div class="form-check">
        <input class="form-check-input" type="checkbox" v-model="modalFields.fundamental" />
        <label class="form-check-label" for="flexCheckDefault">
          Ha d'aprovar-se per a aprovar el RA
        </label>
        <p v-if="errors.fundamental" class="error">{{ errors.fundamental }}</p>
      </div>
    </ModalComponent>
    <app-breadcrumb :actualStep="8" :done="true"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }}) - {{ syllabus.courseYear }}</h2>
    <div class="row">
      <h3>Qualificació</h3>
      <table>
        <tbody>
        <template v-for="ls in learningSituationsToShow" :key="ls.id">
          <tr>
            <th colspan="6">
              <h4 class="bg-secondary text-white">S.A. {{ ls.position }}: {{ ls.title }}</h4>
            </th>
          </tr>
          <tr class="border">
            <show-table :columns="activityColumns" :data="ls?.activities">
              <template #default="{ item }">
                <button @click="showModal(item)" class="btn btn-secondary" title="Editar">
                  <i class="bi bi-pencil"></i>
                </button>
              </template>
              <template #footer>
                <th colspan="3">TOTAL</th>
                <th>{{ ls.totalPercentageWeight }} %</th>
                <th> %</th>
              </template>
            </show-table>
          </tr>
        </template>
        </tbody>
      </table>
    </div>
  </main>
</template>
