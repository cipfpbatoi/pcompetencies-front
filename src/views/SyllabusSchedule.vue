<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'
import ShowTable from '@/components/ShowTable.vue'

const DAYS_NAME = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']

const complementaryActivColumns = [
  {
    title: 'Nom',
    value: 'description'
  },
  {
    title: 'Continguts',
    func: (x) => (x ? x.join(', ') : '---'),
    param: 'contentDescriptors'
  }
]
const inCompanyTrainingColumns = [
  {
    title: "Situació d'aprenentatge",
    value: 'title'
  },
  {
    title: 'Data inici',
    value: 'startDate'
  },
  {
    title: 'Data fi',
    value: 'endDate'
  }
]
export default {
  components: {
    AppBreadcrumb,
    ModalComponent,
    ShowTable
  },
  computed: {
    ...mapState(useDataStore, ['syllabus']),
    done() {
      return !!this.syllabus.schedules?.length
    },
    totalHours() {
      return this.modalFields.entries?.reduce((total, item) => total + item.hours, 0) || 0
    },
    hoursClass() {
      return this.totalHours === this.syllabus.weekHours ? 'text-success' : 'text-danger'
    }
  },
  async mounted() {
    try {
      this.restrictions = await api.getInCompanyTrainingRestrictions(this.syllabus.id)
    } catch (error) {
      this.addMessage('error', error)
    }
    this.ScheduleModal = new Modal(document.getElementById('scheduleModal'))
    this.ScheduleModalInCompanyTraining = new Modal(
      document.getElementById('scheduleModalInCompanyTraining')
    )
    this.ActivitiesModal = new Modal(document.getElementById('complementaryActivitiesModal'))
  },
  data() {
    return {
      errors: {},
      ScheduleModal: null,
      ScheduleModalInCompanyTraining: null,
      ActivitiesModal: null,
      modalFields: { inCompanyTraining: {} },
      modalTitle: '',
      DAYS_NAME,
      complementaryActivColumns,
      inCompanyTrainingColumns,
      newContent: '',
      restrictions: {}
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    lsToScheduleInCompanyTraining(schedule) {
      return this.syllabus.learningSituations
        .filter((item) => item.inCompanyTraining)
        .map((ls) => {
          const lsInCompanyTrainingEntries = schedule.inCompanyTrainingEntries.find(
            (item) => item.learningSituationId === ls.id
          )
          return {
            id: ls.id,
            title: ls.title,
            position: ls.position,
            startDate: lsInCompanyTrainingEntries?.startDate || '',
            endDate: lsInCompanyTrainingEntries?.endDate || '',
            schedule: schedule
          }
        })
    },
    showModal(type, data, group) {
      this.errors = {}
      switch (type) {
        case 'schedule':
          if (data) {
            this.modalFields = { ...data }
            this.modalTitle = 'Editar temporalització'
          } else {
            this.modalFields = {}
            this.modalTitle = "Temporalització d'un nou grup"
          }
          this.modalFields.entries = this.daysWithData(data)

          this.ScheduleModal.show()
          break
        case 'scheduleInCompanyTraining':
          this.modalFields = { ...data }
          this.modalTitle = "Temporalització per al grup '" + data.schedule.nameGroup + "'"
          this.modalFields.restrictions = this.restrictions
          if (group) {
            this.modalFields.inCompanyTraining = group
            this.modalFields.adding = false
          } else {
            this.modalFields.inCompanyTraining = {}
            this.modalFields.adding = true
          }
          this.ScheduleModalInCompanyTraining.show()
          break
        case 'activity':
          if (data) {
            this.modalFields = {
              ...data,
              contentDescriptors: [...data.contentDescriptors]
            }
            this.modalTitle = 'Editar activitat complementària'
          } else {
            this.modalFields = {
              description: '',
              contentDescriptors: []
            }
            this.modalTitle = 'Agegir nova activitat complementària'
          }

          this.ActivitiesModal.show()
          break
      }
    },
    daysWithData(schedule) {
      return DAYS_NAME.map((day, index) => {
        const data = schedule?.entries.find((entry) => entry.day === index + 1)
        return {
          name: day,
          day: index + 1,
          hours: data?.hours || 0
        }
      })
    },
    async delSchedule(schedule) {
      if (
        confirm(
          "Vas a eliminar la temporalització del grup '" +
          schedule.nameGroup +
          "'. Aquesta operació no es pot des-fer"
        )
      ) {
        try {
          await api.deleteSchedule(this.syllabus.id, schedule.id)
          this.ScheduleModal.hide()
          const index = this.syllabus.schedules.findIndex((item) => item.id === schedule.id)
          this.syllabus.schedules.splice(index, 1)
          this.addMessage('success', 'Temporalització eliminada')
        } catch (error) {
          this.addMessage('error', error)
        }
      }
    },
    async saveSchedule() {
      this.errors = {}
      if (this.totalHours !== this.syllabus.weekHours) {
        this.errors.hours = 'Les hores totals setmanals han de ser ' + this.syllabus.weekHours
      }
      const findScheduleGroup = this.syllabus.schedules.find(
        (item) => item.nameGroup === this.modalFields.nameGroup
      )
      if (findScheduleGroup && findScheduleGroup.id !== this.modalFields.id) {
        this.errors.nameGroup = 'Ja hi ha una temporalització per a aquest grup'
      }
      if (Object.keys(this.errors).length) return

      try {
        const data = {
          nameGroup: this.modalFields.nameGroup,
          entries: this.modalFields.entries
            .filter((item) => item.hours > 0)
            .map((item) => {
              return {
                day: item.day,
                hours: item.hours
              }
            })
        }
        if (this.modalFields.id) {
          data.scheduleId = this.modalFields.id
        }
        const response = await api.saveSchedule(this.syllabus.id, data)
        this.ScheduleModal.hide()
        if (this.modalFields.id) {
          const index = this.syllabus.schedules.findIndex((item) => item.id === response.data.id)
          this.syllabus.schedules.splice(index, 1, response.data)
        } else {
          this.syllabus.schedules.push(response.data)
        }
        this.addMessage('success', 'Temporalització guardada')
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async saveInCompanyTraining() {
      this.errors = {}
      if (!this.modalFields.startDate) {
        this.errors.startDate = "'Has d'indicar una data d'inici de la S.A."
      }
      if (!this.modalFields.endDate) {
        this.errors.endDate = "'Has d'indicar una data de finalització de la S.A."
      }
      if (this.modalFields.startDate > this.modalFields.endDate) {
        this.errors.endDate = "La data de finalització ha de ser posterior a la d'inici"
      }
      if (Object.keys(this.errors).length) return

      const lsIndex = this.modalFields.schedule.inCompanyTrainingEntries.findIndex(
        (item) => item.learningSituationId === this.modalFields.id
      )
      if (lsIndex === -1) {
        this.modalFields.schedule.inCompanyTrainingEntries.push({
          learningSituationId: this.modalFields.id,
          startDate: this.modalFields.startDate,
          endDate: this.modalFields.endDate
        })
      } else {
        this.modalFields.schedule.inCompanyTrainingEntries[lsIndex] = {
          learningSituationId: this.modalFields.id,
          startDate: this.modalFields.startDate,
          endDate: this.modalFields.endDate
        }
      }

      const data = {
        nameGroup: this.modalFields.schedule.nameGroup,
        scheduleId: this.modalFields.schedule.id,
        inCompanyTrainingEntries: this.modalFields.schedule.inCompanyTrainingEntries,
        entries: this.modalFields.schedule.entries
          .filter((item) => item.hours > 0)
          .map((item) => {
            return {
              day: item.day,
              hours: item.hours
            }
          })
      }
      try {
        const response = await api.saveSchedule(this.syllabus.id, data)
        const index = this.syllabus.schedules.findIndex((item) => item.id === response.data.id)
        this.syllabus.schedules.splice(index, 1, response.data)
      } catch (error) {
        this.errors.otherErrors = error?.response?.data?.detail || error
        return
      }
      this.ScheduleModalInCompanyTraining.hide()
      this.addMessage('success', 'Temporalització guardada')
    },
    async deleteComplementaryActivity(activity) {
      if (
        confirm(
          "ATENCIÓ: Vas a esborrar l'activitat '" +
          activity.description +
          "'. Aquest procés NO es por des-fer !!!"
        )
      ) {
        try {
          await api.deleteComplementaryActivity(this.syllabus.id, activity.id)
          this.syllabus.complementaryActivities = this.syllabus.complementaryActivities.filter(
            (item) => item.id !== activity.id
          )
          this.addMessage('success', 'Activitat eliminada')
        } catch (error) {
          this.addMessage('error', error)
        }
      }
    },
    delContent(index) {
      this.modalFields.contentDescriptors.splice(index, 1)
    },
    addContent() {
      if (this.newContent.length < 5) {
        this.errors.contentDescriptors = 'Al menys ha de tindre 5 caracters'
        return
      }
      this.modalFields.contentDescriptors.push(this.newContent)
      this.newContent = ''
      this.errors = {}
    },
    async saveContents() {
      // COmprovacions
      this.errors = {}
      if (this.modalFields.description.length < 10) {
        this.errors.description = 'Has de posar una descripció de al menys 10 caracters'
      }
      if (!this.modalFields.contentDescriptors.length) {
        this.errors.contentDescriptors = "L'activitat ha de tractar al menys 1 contingut"
      }
      if (Object.keys(this.errors).length) return

      if (this.modalFields.id) {
        this.modalFields.activityId = this.modalFields.id
        delete this.modalFields.id
      }
      try {
        const response = await api.saveComplementaryActivity(this.syllabus.id, this.modalFields)
        if (this.modalFields.activityId) {
          const index = this.syllabus.complementaryActivities.findIndex(
            (item) => item.id === response.data.id
          )
          this.syllabus.complementaryActivities.splice(index, 1, response.data)
        } else {
          this.syllabus.complementaryActivities.push(response.data)
        }
        this.ActivitiesModal.hide()
        this.addMessage('success', 'Activitat guardada')
      } catch (error) {
        this.addMessage('error', error)
      }
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <ModalComponent @save="saveSchedule" :title="modalTitle" modalId="scheduleModal">
      <div class="row g-3 align-items-center">
        <div class="col-auto">
          <label class="form-label">Nom del grup</label>
        </div>
        <div class="col-auto">
          <select v-model="modalFields.nameGroup">
            <option value="">--- Tria el grup ---</option>
            <option value="A">Grup A</option>
            <option value="B">Grup B</option>
            <option value="C">Grup C</option>
            <option value="D">Grup D</option>
          </select>
          <input type="text" v-model="modalFields.nameGroup" />
        </div>
        <div class="col-auto">
          <p v-if="errors.nameGroup" class="error">{{ errors.nameGroup }}</p>
        </div>
      </div>
      <p>Indica les hores setmanals en el grup:</p>
      <table class="table table-striped">
        <thead>
        <th v-for="entry in modalFields.entries" :key="entry.day">
          {{ entry.name }}
        </th>
        <th>Total</th>
        </thead>
        <tbody>
        <td v-for="entry in modalFields.entries" :key="entry.day">
          <input type="number" v-model="entry.hours" min="0" size="2" />
        </td>
        <td :class="hoursClass">{{ totalHours }} de {{ syllabus.weekHours }}</td>
        </tbody>
      </table>
      <div class="col-auto">
        <p v-if="errors.hours" class="error">{{ errors.hours }}</p>
      </div>
    </ModalComponent>
    <ModalComponent
      @save="saveInCompanyTraining"
      :title="modalTitle"
      modalId="scheduleModalInCompanyTraining"
    >
      <div class="row p-2">
        <p class="form-label p-2 fw-bold"
        >SA {{ modalFields.position }}: {{ modalFields.title }}</p
        >
        <div v-if="restrictions?.data?.length">
          <div class="alert alert-success" role="alert">
            <h4 >Atenció!</h4>
            <p>El teu centre ha establit uns <strong>períodes de formació en empresa</strong>.</p>
            <p>Has de <strong>temporalitzar</strong> les <strong>SA</strong> a desenvolupar a la <strong>empresa</strong> en els següents períodes:</p>
            <ul>
              <li v-for="restriction in restrictions.data" :key="restriction.id">
                el <strong>{{ (new Date(restriction.startDate)).toLocaleDateString() }}</strong>
                i el <strong>{{ (new Date(restriction.endDate)).toLocaleDateString() }}</strong>
                ({{ restriction.stage?.description }})
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="input-group cols-8 p-2">
          <label class="form-label p-2 fw-bold col-sm-6 col-lg-3">Data d'inici de la S.A.</label>
          <input
            type="date"
            v-model="modalFields.startDate"
            class="form-control p-2 col-sm-2 col-lg-1"
          />
          <p v-if="errors.startDate" class="error p-2">{{ errors.startDate }}</p>
        </div>
      </div>
      <div class="row">
        <div class="input-group cols-8 p-2">
          <label class="form-label p-2 fw-bold col-sm-6 col-lg-3">Data de fi de la S.A.</label>
          <input
            type="date"
            v-model="modalFields.endDate"
            class="form-control p-2 col-sm-2 col-lg-1"
          />
          <p v-if="errors.endDate" class="error p-2">{{ errors.endDate }}</p>
        </div>
      </div>
      <div class="row">
        <p v-if="errors.otherErrors" class="error p-2">{{ errors.otherErrors }}</p>
      </div>
    </ModalComponent>
    <ModalComponent @save="saveContents" :title="modalTitle" modalId="complementaryActivitiesModal">
      <div class="row p-2">
        <div class="input-group cols-8 p-2">
          <label class="form-label p-2 fw-bold col-sm-2 col-lg-1">Nom</label>
          <input type="text" v-model="modalFields.description" class="form-control p-2" />
          <p v-if="errors.description" class="error p-2">{{ errors.description }}</p>
        </div>
      </div>
      <div class="row">
        <p><strong>Continguts tractats en l'activitat:</strong></p>
        <table class="table table-striped">
          <tbody>
          <tr v-for="(item, index) in modalFields.contentDescriptors" :key="index">
            <td>{{ item }}</td>
            <td class="text-end">
              <button @click="delContent(index)" class="btn btn-secondary" title="Eliminar">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
          </tbody>
        </table>
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
        <p v-if="errors.contentDescriptors" class="error">{{ errors.contentDescriptors }}</p>
      </div>
    </ModalComponent>

    <app-breadcrumb :actualStep="8" :done="done"></app-breadcrumb>
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ syllabus.module?.name }} ({{
        syllabus.turn === 'presential' ? 'Presencial' : 'Semi-presencial'
      }}) - {{ syllabus.courseYear }}
    </div>
    <div class="p-lg-4 p-1 mt-2">
      <h2>8.a Temporalització</h2>
      <div class="container">
        <div
          v-for="schedule in syllabus.schedules"
          :key="schedule.id"
          class="p-2 border border-dark"
        >
          <div class="text-center">
            <span class="h3 px-2 align-middle">Grup {{ schedule.nameGroup }}</span>
            <button
              @click="showModal('schedule', schedule)"
              class="btn btn-secondary"
              title="Editar"
            >
              <i class="bi bi-pencil"></i>
            </button>
            <button @click="delSchedule(schedule)" class="btn btn-secondary" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </div>
          <table class="table table-striped text-center">
            <thead>
            <th v-for="(entry, index) in schedule.entries" :key="index">
              {{ DAYS_NAME[entry.day - 1] }}
            </th>
            </thead>
            <tbody>
            <td class="border m-2" v-for="(entry, index) in schedule.entries" :key="index">
              {{ entry.hours }} h.
            </td>
            </tbody>
          </table>
          <div>
            <h5>Temporalització de la Formació en Empresa</h5>
            <show-table
              :data="lsToScheduleInCompanyTraining(schedule)"
              :columns="inCompanyTrainingColumns"
            >
              <template #default="{ item }">
                <button
                  @click="showModal('scheduleInCompanyTraining', item)"
                  class="btn btn-secondary"
                  title="Editar"
                >
                  <i class="bi bi-pencil"></i>
                </button>
              </template>
            </show-table>
          </div>
        </div>
        <div class="text-center">
          <button
            @click="showModal('schedule')"
            class="btn btn-success mt-2 mx-auto"
            title="Afegir temporalització"
          >
            Afegir temporalització d'un nou grup
          </button>
        </div>
      </div>
      <h2>8.b. Activitats complementàries</h2>
      <p>
        Són les organitzades en el centre en horari escolar y que es diferèncien de les lectivas pel
        moment, espais o recursos que utilitzen.
      </p>
      <show-table :data="syllabus.complementaryActivities" :columns="complementaryActivColumns">
        <template #default="{ item }">
          <button @click="showModal('activity', item)" class="btn btn-secondary" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button
            @click="deleteComplementaryActivity(item)"
            class="btn btn-secondary"
            title="Eliminar"
          >
            <i class="bi bi-trash"></i>
          </button>
        </template>
      </show-table>
      <div class="text-center">
        <button
          @click="showModal('activity')"
          class="btn btn-success mt-2 mx-auto"
          title="Establir objectiu"
        >
          Afegir activitat complementària
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.error {
  color: red;
}
</style>
