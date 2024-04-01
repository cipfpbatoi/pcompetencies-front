<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import * as yup from 'yup'
import { object } from 'yup'
import ShowTable from '@/components/ShowTable.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '../components/AppBreadcrumb.vue'
import {api} from '../repositories/api'

const learningSituationsColumns = [
  {
    title: 'Num.',
    value: 'position'
  },
  {
    title: 'Títol',
    value: 'title'
  },
  {
    title: 'Coneix. previs',
    value: 'priorKnowledge'
  }
]

const modalValidationSchema = object({
  priorKnowledge: yup
    .string()
})

export default {
  components: {
    AppBreadcrumb,
    ShowTable,
    ModalComponent,
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'cycle']),
    done() {
      return !this.syllabus.learningSituations?.some(item =>
      !item.priorKnowledge)
    },
    modalTitle() {
      return `${ this.actualUnit.position }: ${ this.actualUnit.title }`
    }
  },
  data() {
    return {
      ModalComponent: null,
      actualUnit: {},
      modalFields: {
        priorKnowledge: ''
      },
      errors: [],
      learningSituationsColumns,
    }
  },
  mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
    this.ModalComponent = new Modal(document.getElementById('unitMmodalComp'))
  },
  methods: {
    ...mapActions(useDataStore, ['saveLearningSituationPriorKnowledge']),
    async showModal(unit) {
      const response = await api.getLearningSituationById(unit.id)
      this.actualUnit = response.data
      this.modalFields.priorKnowledge = this.actualUnit.priorKnowledge
      this.ModalComponent.show()
    },
    async saveData() {
      try {
        // Valida los datos del formulario con Yup
        await modalValidationSchema.validate(this.modalFields, { abortEarly: false })
      } catch (error) {
        // Maneja los errores de validación y actualiza el estado de los errores
        const formattedErrors = {}
        if (error.inner) {
          error.inner.forEach((validationError) => {
            formattedErrors[validationError.path] = validationError.message
          })
          this.errors = formattedErrors
        }
        return
      }
      if (!this.modalFields.priorKnowledge) {
        if (!confirm("Vas a eliminar els coneixements previs d'aquesta situació d'aprenentatge")) {
          return
        }
      }
      const response = await this.saveLearningSituationPriorKnowledge(this.actualUnit.id, {
        priorKnowledge: this.modalFields.priorKnowledge,
      })
      if (response === 'ok') {
        this.ModalComponent.hide()
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
  <main>
    <app-breadcrumb :actualStep="8" :done="done"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }})</h2>
    <div>
      <h3>Continguts</h3>
      <show-table :data="syllabus.learningSituations" :columns="learningSituationsColumns">
        <template v-slot="{ item }">
          <button @click="showModal(item)" class="btn btn-secondary" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
        </template>
      </show-table>
      <ModalComponent @save="saveData" :title="modalTitle">
        <div class="row">
              <label class="form-label">Coneixements previs</label>
              <textarea class="form-control" v-model="modalFields.priorKnowledge"></textarea>
              <span v-if="errors.priorKnowledge" class="error">{{ errors.priorKnowledge }}</span>
          </div>
      </ModalComponent>
    </div>
  </main>
</template>
