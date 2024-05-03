<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'

const DAYS_NAME = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']

export default {
  components: {
    AppBreadcrumb,
    ModalComponent
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
      return this.totalHours === this.syllabus.module?.weekHours ? 'text-success' : 'text-danger'
    }
  },
  mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
    this.GenericModal = new Modal(document.getElementById('scheduleModal'))
  },
  data() {
    return {
      errors: {},
      GenericModal: null,
      modalFields: {},
      modalTitle: '',
      DAYS_NAME
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    showModal(schedule) {
      this.errors = {}
      if (schedule) {
        this.modalTitle = 'Editar temporalització'
        this.modalFields = { ...schedule }
      } else {
        this.modalTitle = "Temporalització d'un nou grup"
        this.modalFields = {}
      }
      this.modalFields.entries = this.daysWithData(schedule)

      this.GenericModal.show()
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
          this.GenericModal.hide()
          const index = this.syllabus.schedules.findIndex((item) => item.id === schedule.id)
          this.syllabus.schedules.splice(index, 1)
          this.addMessage('success', 'Temporalització eliminada')
        } catch (error) {
          this.addMessage('error', error)
        }
      }
    },
    async saveData() {
      if (this.totalHours !== this.syllabus.module?.weekHours) {
        this.errors.hours =
          'Les hores totals setmanals han de ser ' + this.syllabus.module?.weekHours
      }
      const findScheduleGroup = this.syllabus.schedules.find(item => item.nameGroup === this.modalFields.nameGroup)
      if (findScheduleGroup && findScheduleGroup.id !== this.modalFields.id) {
          this.errors.nameGroup =
          'Ja hi ha una temporalització per a aquest grup'
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
        this.GenericModal.hide()
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
    }
  }
}
</script>

<template>
  <main>
    <ModalComponent @save="saveData" :title="modalTitle" modalId="scheduleModal">
      <div class="row g-3 align-items-center">
        <div class="col-auto">
          <label class="form-label">Nom del grup</label>
        </div>
        <div class="col-auto">
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
          <td :class="hoursClass">{{ totalHours }} de {{ syllabus.module?.weekHours }}</td>
        </tbody>
      </table>
      <div class="col-auto">
        <p v-if="errors.hours" class="error">{{ errors.hours }}</p>
      </div>
    </ModalComponent>

    <app-breadcrumb :actualStep="7" :done="done"></app-breadcrumb>

    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }}) - {{ syllabus.courseYear }}</h2>
    <h3>Temporalització</h3>
    <div v-for="schedule in syllabus.schedules" :key="schedule.id" class="p-2">
      <h4>
        Grup {{ schedule.nameGroup }}
        <button @click="showModal(schedule)" class="btn btn-secondary" title="Editar">
          <i class="bi bi-pencil"></i>
        </button>
        <button @click="delSchedule(schedule)" class="btn btn-secondary" title="Eliminar">
          <i class="bi bi-trash"></i>
        </button>
      </h4>
      <table class="table table-striped">
        <thead>
          <th v-for="(entry, index) in schedule.entries" :key="index">
            {{ DAYS_NAME[entry.day - 1] }}
          </th>
        </thead>
        <tbody>
          <td v-for="(entry, index) in schedule.entries" :key="index">{{ entry.hours }} h.</td>
        </tbody>
      </table>
    </div>
    <div class="text-center">
      <button @click="showModal()" class="btn btn-success mt-2 mx-auto" title="Establir objectiu">
        Afegir temporalització d'un nou grup
      </button>
    </div>
  </main>
</template>

<style scoped>
.error {
  color: red;
}
</style>
