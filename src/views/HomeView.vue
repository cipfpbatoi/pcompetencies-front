<script>
import { api } from '../repositories/api.js'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { statusClass } from '../utils/utils.js'

export default {
  components: {
    ModalComponent
  },
  async mounted() {
    this.syllabuses = []
    try {
      const [respCicles, respData] = await Promise.all([api.getCycles(), api.getCurrentData()])
      this.cycles = respCicles.data
      this.currentData = respData.data
      if (this.cycle.id) {
        this.cycleSelect = this.cycle.id
        await this.getModules()
        if (this.module.code) {
          this.moduleSelect = this.module.code
          this.getSyllabuses()
        }
      }
    } catch (error) {
      this.addMessage('error', error)
    }
    this.GenericModal = new Modal(document.getElementById('unitMmodalComp'))
  },
  computed: {
    ...mapState(useDataStore, ['cycle', 'module']),
    selectedModule() {
      return this.cycle.modules.find((item) => item.code == this.moduleSelect) || {}
    },
    canEdit() {
      const today = new Date()
      const initDateArray = this.currentData.syllabusStartDate?.split('/')
      const initDate = new Date(initDateArray[2], initDateArray[1] - 1, initDateArray[0])
      const finishDateArray = this.currentData.syllabusFinishDate?.split('/')
      const finDate = new Date(finishDateArray[2], finishDateArray[1] - 1, finishDateArray[0])
      if (today.getTime() >= initDate.getTime() && today.getTime() <= finDate.getTime()) {
        return true
      }
      return false
    },
  },
  data() {
    return {
      cycles: [],
      currentData: {},
      cycleSelect: '',
      moduleSelect: '',
      syllabuses: [],
      done: false,
      GenericModal: null,
      modalFields: {},
      errors: {},
      // CKEditor
      editor: ClassicEditor,
      editorConfig: {
        // The configuration of the editor.
      }
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage', 'fetchData', 'fetchCycle']),
    getSyllabusByTurn(turn) {
      return this.syllabuses.find((item) => item.turn == turn) || {}
    },
    showModal(turn) {
      this.errors = {}
      this.modalFields = {
        turn,
        editable: false,
        currentImprovementProposal: this.getSyllabusByTurn(turn).currentImprovementProposal?.proposals || ''
      }
      this.GenericModal.show()
    },
    isSyllabusOfCurrentYear(turn) {
      return this.getSyllabusByTurn(turn).courseYear == this.currentData.currentSchoolYear.course    },
    editButtonText(turn) {
      const syllabus = this.getSyllabusByTurn(turn)
      return syllabus.id
        ? this.isSyllabusOfCurrentYear(turn)
          ? 'Editar la programació'
          : 'Crear programació a partir de la del curs ' + syllabus.courseYear 
        : 'Crear nova programació'
    },
    async saveImprovementProposals() {
      if (!this.modalFields.editable) {
        this.GenericModal.hide()
        return
      }
      if (!this.modalFields.currentImprovementProposal) {
        if (
          !confirm("Estàs segur que vols eliminar les propostes de millora d'aquesta programació?")
        ) {
          return
        }
      }

      try {
        const syllabus = this.getSyllabusByTurn(this.modalFields.turn)
        const response = await api.createImprovement(syllabus.id, {
          proposals: this.modalFields.currentImprovementProposal
        })
        syllabus.currentImprovementProposal = response.data
        this.GenericModal.hide()
        this.addMessage('success', 'Propostes de millora guardades')
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async getModules() {
      if (this.cycleSelect) {
        await this.fetchCycle(this.cycleSelect)
      }
      this.syllabuses = []
      this.moduleSelect = ''
      this.done = false
    },
    async getSyllabuses() {
      try {
        const response = await api.getSyllabusByCycleAndModule(this.cycleSelect, this.moduleSelect)
        this.syllabuses = response.data
      } catch (error) {
        this.syllabuses = []
        this.addMessage('error', error)
      }
    },
    async editSyllabus(turn) {
      let syllabus = this.getSyllabusByTurn(turn)
      if (!syllabus.id) {
        try {
          const response = await api.createSyllabus({
            cycleId: this.cycleSelect,
            moduleCode: this.moduleSelect,
            turn
          })
          syllabus = response.data
          this.addMessage('success', 'Programació creada')
        } catch (error) {
          this.addMessage('error', error)
          return
        }
      } else if (!this.isSyllabusOfCurrentYear(turn)) {
        try {
          const response = await api.createSyllabusCourseYear(syllabus.id)
          syllabus = response.data
          this.addMessage('success', 'Programació creada')
        } catch (error) {
          this.addMessage('error', error)
          return
        }
      }
      await this.fetchData(this.moduleSelect, syllabus.id)
      this.$router.push('/context')
    },
    async showPdf(turn) {
      try {
        const response = await api.getPdf(this.getSyllabusByTurn(turn).id)
        if (response.status !== 200) {
          this.addMessage('error', response)
        }
        const url = URL.createObjectURL(response.data)
        const pdfWindow = window.open()
        if (pdfWindow) {
          pdfWindow.document.write(`<iframe src="${url}" width="100%" height="100%"></iframe>`)
        } else {
          this.addMessage(
            'error',
            "No s'ha pogut obrir la nova finestra. Configura les Preferències del teu navegador"
          )
        }
      } catch (error) {
        this.addMessage('error', error)
        return
      }
    },
    statusClass(status) {
      return statusClass(status)
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <ModalComponent @save="saveImprovementProposals" title="Propostes de millora">
      <div class="row">
        <div v-show="modalFields.editable">
          <ckeditor
          :editor="editor"
          v-model="modalFields.currentImprovementProposal"
          :config="editorConfig"
        ></ckeditor>
        </div>
        <div v-show="!modalFields.editable">
          <p v-html="modalFields.currentImprovementProposal || 'No hi ha cap proposta'"></p>
          <button @click="modalFields.editable=true" class="btn btn-secondary">Editar</button>
        </div>
        <p v-if="errors.currentImprovementProposal" class="error">
          {{ errors.currentImprovementProposal }}
        </p>
      </div>
    </ModalComponent>
    <h2 class="text-center fw-bold text-primary p-lg-2">Tria la programació</h2>
    <div class="container-fluid px-lg-4">
      <div class="form-group">
        <label class="form-label fw-bold">Cicle</label>
        <select
          v-model="cycleSelect"
          @change="getModules"
          class="form-select form-control"
          aria-label="Selecciona cycleSelect"
        >
          <option value="">-- Selecciona cicle --</option>
          <option v-for="cycleSelect in cycles" :key="cycleSelect.id" :value="cycleSelect.id">
            {{ cycleSelect.completeName }}
          </option>
        </select>
      </div>
      <div v-if="cycleSelect" class="form-group fw-bold mt-3">
        <label>Mòdul</label>
        <select
          v-model="moduleSelect"
          @change="getSyllabuses"
          class="form-select form-control"
          aria-label="Default select example"
        >
          <option value="">-- Selecciona mòdul --</option>
          <option v-for="module in cycle.modules" :key="module.code" :value="module.code">
            {{ module.name }}
          </option>
        </select>
      </div>
      <br />
      <div v-if="moduleSelect" class="form-group">
        <ul>
          <template v-for="(turn) in cycle.availableTurns" :key="turn">
            <li>
              <h3>Modalitat {{ turn == 'presential' ? 'Presencial' : 'Semi-presencial' }}</h3>
              <div v-if="canEdit">
                <button
                  @click="editSyllabus(turn)"
                  class="btn btn-primary position-relative"
                >
                  {{  editButtonText(turn) }}
                  <span v-if="this.isSyllabusOfCurrentYear(turn)"
                    class="position-absolute top-0 start-100 translate-middle badge rounded-pill"
                    :class="statusClass(getSyllabusByTurn(turn).status)"
                  >
                    {{ getSyllabusByTurn(turn).status }}
                  </span>
                </button>
                <p class="bg-danger-subtle">{{ getSyllabusByTurn(turn).rejectedMessage }}</p>
              </div>
              <div v-else>
                <button @click="showModal(turn)" class="btn btn-secondary">
                  Veure/Modificar propostes de millora
                </button>
              </div>
              <br />
              <button
                v-if="getSyllabusByTurn(turn)"
                @click="showPdf(turn)"
                class="btn btn-secondary"
                title="Veure PDF"
              >
                Veure PDF
              </button>
              <strong v-else>No hi ha programació</strong>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </main>
</template>
