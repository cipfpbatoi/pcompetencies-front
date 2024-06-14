<script>
import { api } from '../repositories/api.js'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import ActionButton from '../components/ActionButton.vue'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { statusClass } from '../utils/utils.js'

export default {
  components: {
    ModalComponent,
    ActionButton
  },
  async mounted() {
    this.syllabuses = []
    try {
      const [respCicles, respData] = await Promise.all([api.getCycles(), api.getCurrentData()])
      this.cycles = respCicles.data
      this.currentData = respData.data
      if (this.$route.params.cycleId) {
        this.cycle.id = this.$route.params.cycleId
      }
      if (this.cycle.id) {
        this.cycleSelect = this.cycle.id
        await this.getModules()
        if (this.$route.params.moduleCode) {
          this.module.code = this.$route.params.moduleCode
        }
        if (this.module.code) {
          this.moduleSelect = this.module.code
          this.getSyllabuses()
        }
      }
    } catch (error) {
      this.addMessage('error', error)
    }
    this.ImprovementModal = new Modal(document.getElementById('improvementModal'))
    this.CopySyllabusModal = new Modal(document.getElementById('copySylModal'))
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
    }
  },
  data() {
    return {
      cycles: [],
      currentData: {},
      cycleSelect: '',
      moduleSelect: '',
      syllabuses: [],
      syllabusesToCopy: [],
      done: false,
      ImprovementModal: null,
      CopySyllabusModal: null,
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
        currentImprovementProposal:
          this.getSyllabusByTurn(turn).currentImprovementProposal?.proposals || ''
      }
      this.ImprovementModal.show()
    },
    isSyllabusOfCurrentYear(turn) {
      return this.getSyllabusByTurn(turn).courseYear == this.currentData.currentSchoolYear.course
    },
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
        this.ImprovementModal.hide()
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
        this.ImprovementModal.hide()
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
        const [respSyl, respSylToCopy] = await Promise.all([
          api.getSyllabusByCycleAndModule(this.cycleSelect, this.moduleSelect),
          api.syllabusToCopy(this.moduleSelect)
        ])
        this.syllabuses = respSyl.data
        this.syllabusesToCopy = respSylToCopy.data
        console.log(this.syllabusesToCopy)
      } catch (error) {
        this.syllabuses = []
        this.addMessage('error', error)
      }
    },
    async showCopyModal(turn) {
      this.errors = {}
      this.modalFields = {
        turn,
        selectedSyllabusToCopy: ''
      }
      this.CopySyllabusModal.show()
    },
    async createSyllabus(turn) {
      try {
        await api.createSyllabus({
          cycleId: this.cycleSelect,
          moduleCode: this.moduleSelect,
          turn
        })
        this.addMessage('success', 'Programació creada')
        this.getSyllabuses()
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async copySyllabusFromOther() {
      if (this.modalFields.selectedSyllabusToCopy === '') {
        this.errors.selectedSyllabusToCopy = true
        return
      }
      let syllabusToCopyFrom = this.syllabusesToCopy[this.modalFields.selectedSyllabusToCopy]
      try {
        await api.createSyllabusFromOther(syllabusToCopyFrom.id, {
          destinationCycleId: this.cycleSelect,
          destinationTurn: this.modalFields.turn
        })
        this.addMessage('success', 'Programació creada')
        this.CopySyllabusModal.hide()
        this.getSyllabuses()
      } catch (error) {
        this.addMessage('error', error)
        return
      }
    },
    async copySyllabusFromLastYear(turn) {
      let syllabus = this.getSyllabusByTurn(turn)
      try {
        await api.createSyllabusCourseYear(syllabus.id)
        this.addMessage('success', 'Programació creada')
        this.getSyllabuses()
      } catch (error) {
        this.addMessage('error', error)
        return
      }
    },
    async editSyllabus(turn) {
      let syllabus = this.getSyllabusByTurn(turn)
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
    <ModalComponent @save="saveImprovementProposals" title="Propostes de millora" modalId="improvementModal">
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
    <ModalComponent @save="copySyllabusFromOther" title="Tria quina programació vols copiar" modalId="copySylModal">
      <div class="row p-4">
        <select v-model="modalFields.selectedSyllabusToCopy">
          <option value="">--- Selecciona la programació ---</option>
          <option v-for="(syl, index) in syllabusesToCopy" :key="syl.id" :value="index">
            {{ syl.cycle.shortName }} - {{ syl.turn }}
          </option>
        </select>
        <p v-if="errors.selectedSyllabusToCopy" class="text-danger">Has de triar una programació</p>
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
          <template v-for="turn in cycle.availableTurns" :key="turn">
            <li>
              <h3>Modalitat {{ turn == 'presential' ? 'Presencial' : 'Semi-presencial' }}</h3>
              <div v-if="canEdit">
                <div v-if="getSyllabusByTurn(turn).id">
                  <ActionButton
                    v-if="isSyllabusOfCurrentYear(turn)"
                    :disabled="!['pendent', 'rebutjada'].includes(getSyllabusByTurn(turn).status)"
                    @clicked="editSyllabus(turn)"
                    :status="getSyllabusByTurn(turn).status"
                    title="Editar programació"
                    buttonClass="btn-primary"
                  ></ActionButton>
                  <ActionButton
                    v-else
                    @clicked="copySyllabusFromLastYear(turn)"
                    title="Crear programació a partir de la del curs anterior"
                    buttonClass="btn-primary"
                  ></ActionButton>
                  <p class="bg-danger-subtle">{{ getSyllabusByTurn(turn).rejectedMessage?.reason }}</p>
                </div>
                <div v-else>
                  <ActionButton
                    @clicked="createSyllabus(turn)"
                    title="Crear programació"
                    buttonClass="btn-primary"
                  ></ActionButton>
                  &nbsp;
                  <ActionButton
                    v-if="syllabusesToCopy.length > 0"
                    @clicked="showCopyModal(turn)"
                    title="Crear a partir d'altra programació"
                    buttonClass="btn-primary mt-2 mt-sm-0"
                  ></ActionButton>
                </div>
              </div>
              <div v-else>
                <ActionButton
                  @clicked="showModal(turn)"
                  buttonClass="btn btn-secondary"
                  title="Veure/Modificar propostes de millora"
                >
                </ActionButton>
              </div>
              <br>
              <ActionButton
                v-if="getSyllabusByTurn(turn).id"
                @click="showPdf(turn)"
                buttonClass="btn btn-secondary"
                title="Veure PDF"
              ></ActionButton>
              <strong v-else>No hi ha programació</strong>
            </li>
            <br />
          </template>
        </ul>
      </div>
    </div>
  </main>
</template>
