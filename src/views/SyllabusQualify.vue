<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import ShowTable from '@/components/ShowTable.vue'
import { mapState } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'

const activityColumns = [
  {
    title: 'R.A.',
    func: (x) =>
      Object.keys(x).reduce((tot, ra) => tot + ra + ' ' + x[ra].percentageWeight + '% - ', ''),
    param: 'RA'
  },
  {
    title: 'Codi',
    value: 'code'
  },
  {
    title: "Criteri d'avaluació a utilitzar",
    func: (x) =>
      Object.keys(x).reduce(
        (tot, ra) => tot + ra + ' ' + x[ra].evaluationCriterias.join(', ') + ' - ',
        ''
      ),
    param: 'RA'
  },
  {
    title: 'SA (%)',
    func: (x) => x.toFixed(2) + '%',
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
    ...mapState(useDataStore, ['syllabus'])
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
  },
  data() {
    return {
      itemToModify: '',
      activityColumns,
      sylMarkingActivities: [],
      errors: {},
      // Modal generic
      GenericModal: null,
      modalId: '',
      modalFields: {},
      modalTitle: ''
    }
  },
  methods: {
    showModal(activity) {
      this.modalFields.activity = {
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
    saveActivity() {
      this.GenericModal.hide()
    }
  }
}
</script>

<template>
  <main>
    <ModalComponent @save="saveActivity" :title="modalTitle" id="activityModal">
      <div class="input-group mb-3">
  <span class="input-group-text">Pes:</span>
  <input type="number"
          size="3"
          min="0"
          max="100"
          class="form-control"
          v-model="modalFields.percentageWeight"
        /> %
        <span v-if="errors.percentageWeight" class="input-group-text text-danger">{{ errors.percentageWeight }}</span>
      </div>
      <div class="form-check">
        <input class="form-check-input" type="checkbox" v-model="modalFields.fundamental" />
        <label class="form-check-label" for="flexCheckDefault">
          Ha d'aprovar-se per a aprovar el RA
        </label>
        <p v-if="errors.fundamental" class="error">{{ errors.fundamental }}</p>
      </div>
    </ModalComponent>
    <app-breadcrumb :actualStep="6" :done="true"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }}) - {{ syllabus.courseYear }}</h2>
    <h3>Qualificació</h3>
    <table>
      <tbody>
        <template v-for="ls in syllabus.learningSituations" :key="ls.id">
          <tr>
            <th colspan="6">
              <h4>S.A. {{ ls.position }}: {{ ls.title }}</h4>
            </th>
          </tr>
          <tr class="border">
            <show-table :columns="activityColumns" :data="getActivitiesByLs(ls.id)">
              <template v-slot="{ item }">
                <button @click="showModal(item)" class="btn btn-secondary" title="Editar">
                  <i class="bi bi-pencil"></i>
                </button>
              </template>
            </show-table>
          </tr>
        </template>
      </tbody>
    </table>
  </main>
</template>
