<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import ShowPdfButton from '../components/ShowPdfButton.vue'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

export default {
  components: {
    AppBreadcrumb,
    ModalComponent,
    ShowPdfButton
  },
  computed: {
    ...mapState(useDataStore, ['syllabus'])
  },
  data() {
    return {
      isValid: false,
      isLoading: false,
      errors: false,
      // Modal generic
      OthersGenericModal: null,
      GenericModal: null,
      modalFields: {
        studentsCsv: '',
        nameGroup: ''
      },
      // CKEditor
      editor: ClassicEditor,
      editorConfig: {
        // The configuration of the editor.
      }
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    async validate() {
      try {
        const response = await api.syllabusValidate(this.syllabus.id)
        this.isValid = !response.data.error
        this.errors = response.data.reasons
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async sendSyllabus() {
      if (confirm('Una vegada enviada ja no es pot modificar la programació. Vols continuar?')) {
        try {
          await api.syllabusSend(this.syllabus.id)
          this.addMessage('success', 'Programació enviada correctament')
          this.$router.push({ name: 'selectSyllabus' })
        } catch (error) {
          this.addMessage('error', error)
        }
      }
    },
    async showPdf() {
      try {
        this.isLoading = true
        const response = await api.getPdf(this.syllabus.id)
        this.isLoading = false
        if (!response) {
          this.addMessage('error', response)
          return
        }
        const url = URL.createObjectURL(
          new Blob([response.data], {
            type: 'application/pdf'
          })
        )
        const link = document.createElement('a')
        link.href = url
        link.setAttribute(
          'download',
          this.syllabus.center.code +
            '-' +
            this.syllabus.cycle.shortName.split(' ').join('_') +
            '-' +
            this.syllabus.module.code +
            '-' +
            this.syllabus.courseYear +
            '-' +
            this.syllabus.turn +
            '.pdf'
        )
        document.body.appendChild(link)
        link.click()
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    showModalOthersConsiderations() {
      this.modalFields.othersConsiderations = this.syllabus.othersConsiderations || {}
      this.OthersGenericModal = new Modal(document.getElementById('othersConsiderationsMmodalComp'))
      this.OthersGenericModal.show()
    },
    showModal() {
      this.modalFields.studentsCsv = ''
      this.modalFields.nameGroup = ''
      this.GenericModal = new Modal(document.getElementById('unitMmodalComp'))
      this.GenericModal.show()
    },
    async saveOtherConsiderations() {
      try {
        const response = await api.saveOtherConsiderations(this.syllabus.id, {
          othersConsiderations: this.modalFields.othersConsiderations
        })
        if (response.status !== 201) {
          this.addMessage('error', response)
          return
        }
        this.syllabus.othersConsiderations = this.modalFields.othersConsiderations
        this.OthersGenericModal.hide()
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async getExcel() {
      try {
        this.isLoading = true
        const response = await api.getExcel(
          this.syllabus.id,
          {
            students:  this.modalFields.studentsCsv.split(';'),
            nameGroup: this.modalFields.nameGroup
          }
        )
        this.isLoading = false
        this.GenericModal.hide()
        if (response.status !== 200) {
          this.addMessage('error', response)
          return
        }
        const url = URL.createObjectURL(
          new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          })
        )
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'quadern_professor_'+ this.syllabus.id+'_' + this.removeBadCharactersForFileName(this.syllabus.module.name))
        document.body.appendChild(link)
        link.click()
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    removeBadCharactersForFileName(str) {
      return str
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, '_');
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <app-breadcrumb :actualStep="10" :done="false"></app-breadcrumb>
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ syllabus.module?.name }} ({{
        syllabus.turn === 'presential' ? 'Presencial' : 'Semi-presencial'
      }}) - {{ syllabus.courseYear }}
    </div>
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>10.1. Altres consideracions</h2>
      <div class="border p-2 bg-secondary-subtle border-dark card" style="min-height: 100px">
        <p class="text-start" v-html="syllabus.othersConsiderations"></p>
        <cite v-if="!syllabus.othersConsiderations">No s'han especificat altres consideracions</cite>
      </div>
      <div class="text-center m-2">
        <button
          @click="showModalOthersConsiderations"
          class="btn btn-primary col-sm-5 col-12"
          title=" Afegir/Modificar altres consideracions"
        >
          <i class="bi bi-pencil"></i><span>Altres consideracions</span>
        </button>
      </div>
      <h2 class="mt-2">10.2. Validar i enviar la programació</h2>
      <div v-if="!isValid && !errors">
        <div class="alert alert-info p-2 col-sm-12 col-12 mx-auto text-center">
          <strong>Atenció! </strong>Has de validar la programació abans d'enviar-la
        </div>
      </div>
      <div v-if="isValid">
        <div class="alert alert-success p-2 col-sm-12 col-12 mx-auto text-center">
          <strong>Validada! </strong> La programació està preparada per a ser enviada per a la seva
          aprovació.
        </div>
      </div>
      <div v-if="isValid" class="text-center m-2 row">
        <div class="alert alert-warning p-2 col-sm-12 col-12 mx-auto">
          <strong>ATENCIÓ:</strong> Un cop enviada la programació ja no es pot modificar
        </div>
      </div>
      <div class="text-center m-2">
        <button
          @click="validate"
          class="btn btn-info col-sm-5 col-12"
          title="Validar"
          :disabled="isValid"
        >
          <i class="bi bi-check-circle px-2"></i>
          Validar programació
        </button>
      </div>
      <div v-if="!isValid && errors">
        <div class="alert alert-danger">
          <h4 class="text-center">
            Atenció! La programació te errors i has de corregir-los abans d'enviar-la
          </h4>
          <ul>
            <li v-if="errors.totalHours">{{ errors.totalHours }}</li>
            <li v-if="errors.groupContext">{{ errors.groupContext }}</li>
            <li v-if="errors.improvementsProposals">{{ errors.improvementsProposals }}</li>
            <li v-if="errors.didacticResources">{{ errors.didacticResources }}</li>
            <li v-if="errors.methodologicalPrinciples">{{ errors.methodologicalPrinciples }}</li>
            <li v-if="errors.technologicalModuleProcess">
              {{ errors.technologicalModuleProcess }}
            </li>
            <li v-if="errors.temporalització">
              <h5>Temporalització de les Situacions d'aprenentatge</h5>
              <ul>
                <li v-for="error in errors.temporalització" :key="error">
                   {{ error }}
                </li>
              </ul>
            </li>
          </ul>
          <div v-if="errors.learningSituations">
            <h5>Situacions d'aprenentatge</h5>
            <ul>
              <li v-for="ls in errors.learningSituations" :key="ls">
                S.A. - {{ ls.ls }}
                <ul>
                  <li v-for="error in ls.errors" :key="error">{{ error }}</li>
                </ul>
              </li>
            </ul>
          </div>
          <div v-if="errors.ponderedRA">
            <h5>Resultats d'aprenentatge</h5>
            <ul>
              <li v-for="error in errors.ponderedRA" :key="error">
                {{ error }}
              </li>
            </ul>
          </div>
          <div v-if="errors.evaluationCriteriaNotAssigned">
            <h5>Criteris d'avaluació no assignats a activitats qualificables</h5>
            <ul>
              <li v-for="ra in Object.keys(errors.evaluationCriteriaNotAssigned)" :key="ra">
                {{ ra }}: {{ errors.evaluationCriteriaNotAssigned[ra].join(', ') }}
              </li>
            </ul>
          </div>
          <div v-if="errors.finalEvaluation">
            <h5>Avaluació Final</h5>
            <ul>
              <li v-for="error in errors.finalEvaluation" :key="error">
                {{ error }}
              </li>
            </ul>
          </div>
          <div v-if="errors.InCompanyTrainingRestrictions">
            <h5>Projecte Funcional - Formació en l'empresa</h5>
            <ul>
              <li v-for="error in errors.InCompanyTrainingRestrictions" :key="error">
                {{ error }}
              </li>
            </ul>
          </div>
          <div v-if="errors.assessmentsToolRestrictions">
            <h5>Projecte Funcional - Instruments d'avaluació</h5>
            <ul>
              <li v-for="error in errors.assessmentsToolRestrictions" :key="error">
                {{ error }}
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div v-if="isValid" class="text-center m-2 row">
        <button
          @click="sendSyllabus"
          class="btn btn-success col-sm-5 col-12 mx-auto"
          title="Enviar programació"
        >
          <i class="bi bi-send mx-2"></i>
          Enviar programació al departament
        </button>
      </div>
      <h2 class="mt-2">10.3. Documents</h2>
      <div class="text-center mt-5" v-if="isLoading">
        <span class="spinner-border text-primary"></span>
      </div>
      <div v-else>
        <div class="text-center m-2">
          <button @click="showPdf" class="btn btn-danger col-sm-5 col-12" title="Vore PDF">
            <i class="bi bi-file-earmark-pdf"></i>
            {{ isValid ? 'Vore PDF' : 'Vore esborrany' }}</button
          ><br />
        </div>
        <div class="text-center m-2" :class="{ 'd-none': !isValid }">
          <button
            @click="showModal"
            class="btn btn-primary col-sm-5 col-12"
            title="Quadern del Professorat PDF"
          >
            <i class="bi bi-file-earmark-excel"></i>
            Obtindre quadern de Professorat
          </button>
        </div>
      </div>
      <br />
    </div>
    <ModalComponent modalId="othersConsiderationsMmodalComp" @save="saveOtherConsiderations" title="Altres consideracions">
      <div class="row p-1 align-items-center">
        <p>Altres consideracions</p>
       <div>
          <ckeditor
            :editor="editor"
            v-model="modalFields.othersConsiderations"
            :config="editorConfig"
          ></ckeditor>
        </div>
      </div>
    </ModalComponent>
    <ModalComponent @save="getExcel" title="Quadern del professorat">
      <div class="row p-1 align-items-center">
        <div>
          <select class="form-select form-select-lg mb-3 text-center" required
                  v-model="modalFields.nameGroup">
            <option value="" selected>--- Tria el grup (opcional) ---</option>
            <option v-for="schedule in this.syllabus.schedules" v-bind:value="schedule.nameGroup" >Grup {{ schedule.nameGroup }}</option>
          </select>
        </div>
        <p>Pega la llista d'alumnes separats per <strong>punt i coma</strong></p>
        <div class="form-control">
          <textarea
            class="form-control border-secondary"
            v-model="modalFields.studentsCsv"
            rows="3"
          ></textarea>
        </div>
      </div>
    </ModalComponent>
  </main>
</template>

<style scoped></style>
