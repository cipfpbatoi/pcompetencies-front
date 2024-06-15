<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'
import CheckIcon from '@/components/icons/CheckIcon.vue'

export default {
  components: {
    AppBreadcrumb,
    ModalComponent,
    CheckIcon,
  },
  computed: {
    ...mapState(useDataStore, ['syllabus']),
    totalPercentajeWeight() {
      return this.learningSituationsToShow
      .reduce((total, ls) => total + ls.totalPercentageWeight, 0)
    },
    done() {
      return this.learningSituationsToShow.every((ls) => ls.totalPercentageWeight === 100)
    },
    learningSituationsToShow() {
      if (!this.syllabus.learningSituations || !this.sylMarkingActivities.length) return []
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
            description: item.description,
            ecs: this.getRAData(item),
            ras: ls.ponderedLearningResults.map((lr) => {
              return {
                id: lr.learningResult.id,
                percentageWeight: lr.percentageWeight,
                number: lr.learningResult.number,
                ecs: item.evaluationCriterias.filter(
                  (ec) => ec.learningResult.id === lr.learningResult.id
                )
              }
            })
          }
        })
        learningSituation.totalPercentageWeight = learningSituation.activities.reduce(
          (total, act) => total + act.percentageWeight,
          0
        )
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
    } catch (error) {
      this.addMessage('error', error)
    }
    this.loading = false;
  },
  setup() {
    return {loading: true}
  },
  data() {
    return {
      itemToModify: '',
      sylMarkingActivities: [],
      sylMarkingActivitiesToShow: [],
      errors: {},
      // Modal generic
      GenericModal: null,
      modalId: '',
      modalFields: {},
      modalTitle: '',
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    showModal(activity) {
      this.modalFields = {
        activityId: activity.id,
        percentageWeight: activity.percentageWeight,
        fundamental: activity.fundamental,
        description: activity.description,
        code: activity.code
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
        const response = await api.saveSyllabusMarkingActivities(this.syllabus.id, {
          activities: [this.modalFields]
        })
        const index = this.sylMarkingActivities.findIndex((item) => item.id === response.data[0].id)
        this.sylMarkingActivities.splice(index, 1, response.data[0])
        this.modalFields = {}
        this.GenericModal.hide()
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    showRas(activity) {
      return activity.ras.map((ra) => `RA${ra.number} (${ra.percentageWeight}%)`).join('<br />')
    },
    showCes(activity) {
      return activity.ras
        .filter((ra) => ra.ecs.length)
        .map((ra) => `RA${ra.number} ` + ra.ecs.map((ec) => ec.code).join(', '))
        .join('<br>')
    }
  }
}
</script>

<template>
  <main class="border shadow view-main" >
    <ModalComponent @save="saveActivity" :title="modalTitle" id="activityModal">
      <p>
        <strong>Descripció Activitats {{ modalFields.code }}</strong>
      </p>
      <p class="text-justify">
        <span v-html="modalFields.description"></span>
      </p>
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
    <app-breadcrumb :actualStep="6" :done="done"></app-breadcrumb>
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }}) - {{ syllabus.courseYear }}</h2>
      <h2>6. Qualificació de les Situacions d'Aprenentatge</h2>
      <div class="bg-danger m-1">
    </div>
      <div class="text-center mt-5" :class="{ 'd-none' : !this.loading }">
        <span class="spinner-border text-primary"></span>
      </div>
      <template v-for="ls in learningSituationsToShow" :key="ls.id">
        <h4 class="bg-secondary text-white p-1">S.A. {{ ls.position }}: {{ ls.title }}</h4>
        <p v-if="ls.totalPercentageWeight !== 100" class="bg-danger text-white p-2"><strong>ATENCIÓ:</strong> la suma dels percentatges de la S.A. NO és 100%. Has d'arreglar-lo abans de continuar</p>
        <table class="table table-striped">
          <thead>
            <th>R.A.</th>
            <th>Codi</th>
            <th>Criteri d'avaluació a utilitzar</th>
            <th>S.A. (%)</th>
            <th>Fonamental</th>
            <th>Accions</th>
          </thead>
          <tbody>
            <tr v-for="(activity, index) in ls?.activities" :key="activity.id" class="align-middle">
              <td
                v-if="index === 0"
                :rowspan="ls.activities.length"
                v-html="showRas(activity)"
              ></td>
              <td>{{ activity.code }}</td>
              <td v-html="showCes(activity)"></td>
              <td>{{ activity.percentageWeight }} %</td>
              <td>
                <check-icon :checked="activity.fundamental"></check-icon>
              </td>
              <td>
                <button @click="showModal(activity)" class="btn btn-secondary" title="Editar">
                  <i class="bi bi-pencil"></i>
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3">TOTAL</th>
              <th>{{ ls.totalPercentageWeight }} %</th>
              <th>%</th>
            </tr>
          </tfoot>
        </table>
      </template>
    </div>
  </main>
</template>