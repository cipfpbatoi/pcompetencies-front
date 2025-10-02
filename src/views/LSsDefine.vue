<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import LearnSitModal from '../components/LearnSitModal.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import LrTable from '../components/LrTable.vue'
import ShowTable from '../components/ShowTable.vue'
import AppBreadcrumb from '../components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'
import * as yup from 'yup'
import { object } from 'yup'
import { validateFormErrors } from '../utils/utils.js'

const validationSchema = object({
  name: yup.string().trim().required('Has de posar el nom'),
  description: yup.string().trim().required('Has de posar una descripció del bloc'),
  position: yup
    .number()
    .required("Has d'indicar la posició")
    .min(1, 'La posició no pot ser menor que 1'),
  learningResults: yup.array()
})

const learningSituationsColumns = [
  {
    title: 'Num.',
    value: 'position',
    class: 'text-center'
  },
  {
    title: 'Títol',
    html: true,
      func: (x, y) => { return (y.inCompanyTraining) ? x+'<strong class="badge bg-primary m-1 p-1"> Dualitzable FE</strong> ' : x},
    param: 'title',
  },
  {
    title: 'Hores',
    value: 'hours',
    class: 'text-center'
  },
  {
    title: 'R.A.',
    class: 'text-center',
    func: (x) => {
      if (!x || !x.length) return ''
      return x
        .map(
          (item) =>
            (item.learningResultId || item.learningResult.number) + ` (${item.percentageWeight} %)`
        )
        .join(', ')
    },
    param: 'ponderedLearningResults'
  }
]
const instructionalUnitsColumns = [
  {
    title: 'Bloc',
    value: 'position'
  },
  {
    title: 'Nom',
    value: 'name'
  },
  {
    title: 'Descripció',
    value: 'description'
  },
  {
    title: "Situacions d'Aprenentatge",
    func: (x) => x.map(ls => 'SA ' + ls.position).join(', '),
    param: 'learningSituations'
  }
]
export default {
  components: {
    AppBreadcrumb,
    LrTable,
    ShowTable,
    LearnSitModal,
    ModalComponent
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'module', 'getLearningResultById']),
    done() {
      return !!this.syllabus.learningSituations?.length
    },
    totalHours() {
      return this.syllabus.learningSituations.reduce((total, ls) => total + ls.hours, 0)
    },
    totalRAWeight() {
      return this.syllabus.learningSituations.reduce(
        (total, ls) =>
          total + ls.ponderedLearningResults.reduce((sum, lr) => sum + lr.percentageWeight, 0),
        0
      )
    },
    errorTotalRAWeightClass() {
      return this.totalRAWeight === 100 ? '' : 'bg-danger text-white'
    },
    errorTotalHoursClass() {
      return this.totalHours === this.syllabus.numberOfHours ? '' : 'bg-danger text-white'
    }
  },
  data() {
    return {
      LearnSitModal: null,
      modalData: { ponderedLearningResults: [] },
      learningSituationsColumns,
      instructionalUnits: [],
      instructionalUnitsColumns,
      // Modal generic
      GenericModal: null,
      modalId: '',
      modalFields: { learningSituationId: [] },
      modalTitle: '',
      errors: {},
      validationSchema
    }
  },
  mounted() {
    if (this.syllabus.id) {
      this.getIUnits()
    }
    this.GenericModal = new Modal(document.getElementById('iUnitModal'))
    this.LearnSitModal = new Modal(document.getElementById('unitMmodalComp'))
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage', 'saveLearningSituation', 'deleteLearningSituation']),
    showModal(iUnit) {
      this.errors = {}
      if (iUnit) {
        let iUnitId = iUnit.id
        delete iUnit.id
        this.modalFields = {
          ...iUnit,
          iUnitId: iUnitId,
          learningSituationId: iUnit.learningSituations.map(a => a.id)
        }
        this.modalTitle = 'Editar el bloc ' + iUnit.name
      } else {
        this.modalTitle = 'Nou bloc'
        this.modalFields = {
          position: this.syllabus.instructionalUnits.length + 1,
          learningSituationId: []
        }
      }
      this.GenericModal.show()
    },
    async getIUnits() {
      try {
        const response = await api.getSyllabusInstructionalUnits(this.syllabus.id)
        this.instructionalUnits = response.data
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async saveIUnit() {
      this.errors = await validateFormErrors(validationSchema, this.modalFields)
      if (Object.keys(this.errors).length) return

      try {
        await api.saveSyllabusInstructionalUnit(this.syllabus.id, {
          ...this.modalFields,
          learningSituations: this.modalFields.learningSituationId
        })
        this.modalFields = {}
        this.GenericModal.hide()
        this.addMessage('success', 'Bloc afegit')
      } catch (error) {
        this.addMessage('error', error)
        return
      }
      this.getIUnits()
    },
    async deleteIUnit(iUnit) {
      if (confirm('Vas a esborrar el bloc ' + iUnit.name)) {
        try {
          await api.deleteSyllabusInstructionalUnit(this.syllabus.id, iUnit.id)
          this.addMessage('success', 'Bloc eliminat')
        } catch (error) {
          this.addMessage('error', error)
          return
        }
        this.getIUnits()
      }
    },
    showLSModal(unit) {
      if (unit) {
        this.modalData = unit
      }
      this.LearnSitModal.show()
    },
    hideLSModal(position) {
      if (position) {
        for (let i = position-1; i < this.syllabus.learningSituations.length-1; i++) {
          this.syllabus.learningSituations[i].position++
        }
        this.reorderLSLIst()
      }
      this.LearnSitModal.hide()
    },
    async delUnit(unit) {
      if (
        confirm(
          'ATENCIÓ: Vas a esborrar la unitat "' +
            unit.title +
            '". Aquest procés NO es por des-fer !!!'
        )
      ) {
        let response = null
        try {
          response = await api.getLearningSituationById(unit.id)
        } catch (error) {
          this.addMessage('error', error)
          return
        }
        if (response.data.activities.length) {
          if (
            !confirm(
              'ATENCIÓ: La unitat que vas a esborrar te ' +
                response.data.activities.length +
                ' activitats creades que també es borraran!!!'
            )
          ) {
            return
          }
        }
        this.deleteLearningSituation(unit.id)
        this.syllabus.learningSituations.forEach((element) =>
          element.position > unit.position ? element.position-- : ''
        )
        this.reorderLSLIst()
      }
    },
    simplifyPonderedLearningResults(pLRs) {
      return pLRs.map((item) => {
        return {
          learningResultId: item.learningResult.id,
          percentageWeight: item.percentageWeight
        }
      })
    },
    reorderLSLIst() {
      this.syllabus.learningSituations.sort((a, b) => a.position - b.position)
    },
    changeLSPosition(learningSituation, positionStep) {
      const learningSituationToSwap = this.syllabus.learningSituations.find(
        (item) => item.position === learningSituation.position + positionStep
      )
      if (learningSituationToSwap) {
        this.saveLearningSituation({
          ...learningSituationToSwap,
          position: learningSituation.position,
          ponderedLearningResults: this.simplifyPonderedLearningResults(
            learningSituationToSwap.ponderedLearningResults
          )
        })
        learningSituationToSwap.position = learningSituation.position
      }
      this.saveLearningSituation({
        ...learningSituation,
        position: learningSituation.position + positionStep,
        ponderedLearningResults: this.simplifyPonderedLearningResults(
          learningSituation.ponderedLearningResults
        )
      })
      learningSituation.position = learningSituation.position + positionStep
      this.reorderLSLIst()
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <ModalComponent @save="saveIUnit" :title="modalTitle" id="iUnitModal">
      <div class="input-group mb-3">
        <span class="input-group-text col-2">Posició:</span>
        <input type="number" size="1" min="1" class="form-control" v-model="modalFields.position" />
        <span v-if="errors.position" class="input-group-text text-danger">{{
          errors.position
        }}</span>
      </div>
      <div class="input-group mb-3 col-2">
        <span class="input-group-text col-lg-2">Nom:</span>
        <input type="text" class="form-control" v-model="modalFields.name" />
        <span v-if="errors.name" class="input-group-text text-danger">{{ errors.name }}</span>
      </div>
      <div class="input-group mb-3">
        <span class="input-group-text col-lg-2">Descripció:</span>
        <textarea class="form-control" v-model="modalFields.description"></textarea>
        <span v-if="errors.description" class="input-group-text text-danger">{{
          errors.description
        }}</span>
      </div>
      <div class="input-group mb-3">
        <span class="input-group-text col-lg-2 text-start"
          >Situacions <br />
          d'aprenentatge:</span
        >
        <select class="form-select" multiple v-model="modalFields.learningSituationId">
          <option v-for="ls in syllabus.learningSituations" :key="ls.id" :value="ls.id">
            {{ ls.position }} - {{ ls.title }}
          </option>
        </select>
        <p class="col-12 text-center"><small>(Pots marcar vàries amb Ctrl polsat)</small></p>
        <span v-if="errors.learningSituations" class="input-group-text text-danger">{{
          errors.learningSituations
        }}</span>
      </div>
    </ModalComponent>
    <app-breadcrumb :actualStep="3" :done="done"></app-breadcrumb>
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">{{ syllabus.module?.name }} ({{ (syllabus.turn === 'presential') ? 'Presencial' : 'Semi-presencial'  }}) - {{ syllabus.courseYear }}</div>
    <div class="p-lg-4 p-1">
      <div>
        <h2>3.1 Definir Situacions d'Aprenentatge</h2>
        <div class="text-center">
            <show-table
          class="border border-black p-2 text-center"
          :data="this.syllabus.learningSituations"
          :columns="this.learningSituationsColumns"
        >
          <template #default="{ item }">
            <button
              @click="changeLSPosition(item, -1)"
              class="btn btn-secondary"
              title="Pujar"
              :disabled="item.position <= 1"
            >
              <i class="bi bi-arrow-up"></i>
            </button>
            <button
              :disabled="item.position >= syllabus.learningSituations.length"
              @click="changeLSPosition(item, 1)"
              class="btn btn-secondary"
              title="Baixar"
            >
              <i class="bi bi-arrow-down"></i>
            </button>
            <button @click="showLSModal(item)" class="btn btn-secondary" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button @click="delUnit(item)" class="btn btn-secondary" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </template>
          <template #footer>
            <th colspan="2" class="text-end pe-3">TOTAL</th>
            <th
              :class="[errorTotalHoursClass, 'text-center']"
              :title="`El núm. total d'hores hauria de ser ${syllabus.numberOfHours}`"
            >
              {{ totalHours }} / {{ syllabus.numberOfHours }}
            </th>
            <th
              :class="[errorTotalRAWeightClass, 'text-center']"
              title="El total hauria de ser 100 %"
            >
              {{ totalRAWeight }} %
            </th>
          </template>
        </show-table>
        </div>
        <div class="text-center">
          <button class="btn btn-success mt-2" @click="showLSModal()">
            Afegir Situació d'Aprenentatge
          </button>
        </div>

        <h3>3.2 Blocs formatius</h3>
        <show-table
          class="border border-black p-2"
          :data="this.instructionalUnits"
          :columns="this.instructionalUnitsColumns"
        >
          <template #default="{ item }">
            <button @click="showModal(item)" class="btn btn-secondary" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button @click="deleteIUnit(item)" class="btn btn-secondary" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </template>
        </show-table>
        <div class="text-center">
          <button class="btn btn-success mt-2" @click="showModal()">Afegir Bloc</button>
        </div>
        <LearnSitModal @saved="hideLSModal" :unit="modalData"></LearnSitModal>
      </div>
      <br />
      <div class="border bg-light p-2">
        <h3>Resultats d'aprenentatge</h3>
        <Lr-Table class="border border-black" :learningResults="module.learningResults"></Lr-Table>
      </div>
    </div>
  </main>
</template>
