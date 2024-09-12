<script>
import { api } from '../repositories/api.js'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import ActionButton from '../components/ActionButton.vue'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { statusClass } from '../utils/utils.js'
import BtnGetExcel from '../components/BtnGetExcel.vue'

export default {
  components: {
    ModalComponent,
    ActionButton,
    BtnGetExcel
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
      isLoading: true,
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
      return this.getSyllabusByTurn(turn).courseYear === this.currentData.currentSchoolYear.course
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
      this.isLoading = true
      try {
        const [respSyl, respSylToCopy] = await Promise.all([
          api.getSyllabusByCycleAndModule(this.cycleSelect, this.moduleSelect),
          api.syllabusToCopy(this.moduleSelect)
        ])
        this.syllabuses = respSyl.data
        this.syllabusesToCopy = respSylToCopy.data
      } catch (error) {
        this.syllabuses = []
        this.addMessage('error', error)
      }
      this.isLoading = false
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
          destinationCycleId: parseInt(this.cycleSelect),
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
    openPdf(turn) {
      const syllabus = this.getSyllabusByTurn(turn)
      window.open(
        window.location.origin +
          `/public/syllabus/${syllabus.center.code}/${syllabus.cycle.id}/${syllabus.module.code}/${turn}`,
        '_blank'
      )
    },
    async copySyllabusUrl(turn) {
      const syllabus = this.getSyllabusByTurn(turn)
      const url =
        window.location.origin +
        `/public/syllabus/${syllabus.center.code}/${syllabus.cycle.id}/${syllabus.module.code}/${turn}`
      try {
        await navigator.clipboard.writeText(url)
        this.addMessage('success', 'Enllaç copiat al portapapers')
      } catch (err) {
        this.addMessage('error', 'Error al copiar: ' + err)
      }
    },
    async showPdf(turn) {
      try {
        this.isLoading = true
        let syllabus = this.getSyllabusByTurn(turn)
        const response = await api.getPdf(syllabus.id)
        if (!response) {
          this.addMessage('error', response)
          this.isLoading = false
          return
        }
        const url = URL.createObjectURL(
          new Blob([response.data], {
            type: 'application/pdf'
          })
        )
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'syllabus_' + syllabus.id)
        document.body.appendChild(link)
        link.click()
      } catch (error) {
        this.addMessage('error', error)
      }
      this.isLoading = false
    },
    statusClass(status) {
      return statusClass(status)
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <ModalComponent
      @save="saveImprovementProposals"
      title="Propostes de millora"
      modalId="improvementModal"
    >
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
          <button @click="modalFields.editable = true" class="btn btn-secondary">Editar</button>
        </div>
        <p v-if="errors.currentImprovementProposal" class="error">
          {{ errors.currentImprovementProposal }}
        </p>
      </div>
    </ModalComponent>
    <ModalComponent
      @save="copySyllabusFromOther"
      title="Tria quina programació vols copiar"
      modalId="copySylModal"
    >
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
    <h2 class="text-center fw-bold p-2 text-primary">
      <i class="bi bi-hand-index mx-2"></i>Tria la programació
    </h2>
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
        <div class="text-center mt-5" :class="{ 'd-none': !this.isLoading }">
          <span class="spinner-border text-primary"></span>
        </div>
        <div :class="{ 'd-none': this.isLoading }">
          <template v-for="turn in cycle.availableTurns" :key="turn">
            <div class="card my-2">
              <div class="card-header bg-info text-white text-uppercase fw-bold">
                Modalitat {{ turn == 'presential' ? 'Presencial' : 'Semi-presencial' }}
              </div>
              <div class="card-body text-center">
                <!-- Està obert el periode de modificació de programacions? -->
                <div v-if="canEdit">
                  <div class="my-2" v-if="getSyllabusByTurn(turn).id">
                    <p
                      v-if="['rebutjada'].includes(getSyllabusByTurn(turn).status)"
                      class="alert alert-danger m-2 col-12 col-md-10 mx-auto text-start"
                    >
                      <strong>Rebutjada!</strong> Raó:
                      {{ getSyllabusByTurn(turn).rejectedMessage?.reason }}
                    </p>
                    <ActionButton
                      v-if="isSyllabusOfCurrentYear(turn)"
                      :disabled="!['pendent', 'rebutjada'].includes(getSyllabusByTurn(turn).status)"
                      @clicked="editSyllabus(turn)"
                      :status="getSyllabusByTurn(turn).status"
                      title="Editar programació"
                      buttonClass="btn-success col-12 col-sm-4 text-white"
                      iconClass="bi bi-pencil-fill"
                    ></ActionButton>
                    <ActionButton
                      v-else
                      @clicked="copySyllabusFromLastYear(turn)"
                      title="Crear programació a partir de la del curs anterior"
                      buttonClass="btn-primary col-12 col-sm-4"
                      iconClass="bi bi-plus-circle-fill"
                    ></ActionButton>
                  </div>
                  <div v-else>
                    <ActionButton
                      @clicked="createSyllabus(turn)"
                      title="Crear programació"
                      buttonClass="btn-success col-12 col-sm-4"
                      iconClass="bi bi-plus-circle-fill"
                    ></ActionButton>
                    <div v-if="syllabusesToCopy.length > 0" class="mt-3">
                      <ActionButton
                        @clicked="showCopyModal(turn)"
                        title="Crear a partir d'altra programació"
                        buttonClass="btn-primary mt-2 mt-sm-0 col-12 col-sm-4"
                        iconClass="bi bi-node-plus-fill"
                      ></ActionButton>
                    </div>
                  </div>
                </div>
                <div v-else>
                  <ActionButton
                    @clicked="showModal(turn)"
                    buttonClass="btn btn-secondary col-12 col-sm-4"
                    title="Veure/Modificar propostes de millora"
                  >
                  </ActionButton>
                </div>
                <div v-if="getSyllabusByTurn(turn)?.status == 'aprovada'">
                  <ActionButton
                    v-if="getSyllabusByTurn(turn).id"
                    @click="openPdf(turn)"
                    buttonClass="btn btn-danger col-12 col-sm-4"
                    title="Veure PDF"
                    icon-class="bi bi-file-earmark-pdf-fill"
                  ></ActionButton>
                  <p class="alert alert-info col-12 col-lg-10 text-center m-auto mt-2">
                    Esta programació ja està aprovada i, per tant, és pública. Pots copiar l'enllaç
                    per a passar-li-ho als alumnes.
                    <button
                      @click="copySyllabusUrl(turn)"
                      type="button"
                      class="btn btn-secondary btn-sm"
                      title="Copiar enllaç"
                    >
                      <i class="bi bi-copy"></i>
                    </button>
                  </p>
                </div>
                <div v-else>
                  <ActionButton
                    v-if="getSyllabusByTurn(turn).id"
                    @click="showPdf(turn)"
                    buttonClass="btn btn-danger col-12 col-sm-4"
                    title="Veure esborrany"
                    icon-class="bi bi-file-earmark-pdf-fill"
                  ></ActionButton>
                </div>
                <div v-if="getSyllabusByTurn(turn)?.status !== 'pendent'">
                  <BtnGetExcel :syllabus-id="getSyllabusByTurn(turn).id" btnClass="col-sm-4 col-12"></BtnGetExcel>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </main>
</template>
<style>
[v-cloak] {
  display: none;
}
</style>
