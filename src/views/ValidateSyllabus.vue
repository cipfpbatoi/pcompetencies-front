<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import ShowPdfButton from '../components/ShowPdfButton.vue'

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
      GenericModal: null,
      modalFields: {
        studentsCsv: ''
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
        link.setAttribute('download', this.syllabus.center.code 
          + '-' + this.syllabus.cycle.shortName.split(' ').join('_')
          + '-' + this.syllabus.module.code
          + '-' + this.syllabus.courseYear
          + '-' + this.syllabus.turn + '.pdf')
        document.body.appendChild(link)
        link.click()
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    showModal() {
      this.modalFields.studentsCsv = ''
      this.GenericModal = new Modal(document.getElementById('unitMmodalComp'))
      this.GenericModal.show()
    },
    async getExcel() {
      try {
        this.isLoading = true
        const response = await api.getExcel(
          this.syllabus.id,
          this.modalFields.studentsCsv.split(';')
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
        link.setAttribute('download', 'quadern_programacio_' + this.syllabus.id)
        document.body.appendChild(link)
        link.click()
      } catch (error) {
        this.addMessage('error', error)
      }
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
      <h2>10.1. Validar i enviar la programació</h2>
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
            <li v-if="errors.temporalitzacio">
              {{ errors.temporalitzacio }}
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
      <h2>10.2. Documents</h2>
      <div class="text-center mt-5" v-if="isLoading">
        <span class="spinner-border text-primary"></span>
      </div>
      <div v-else>
        <div class="text-center m-2">
          <button @click="showPdf" class="btn btn-danger col-sm-5 col-12" title="Vore PDF">
            <i class="bi bi-file-earmark-pdf"></i>
            {{ isValid ? 'Vore PDF' : 'Vore esborrany' }}
          </button><br>
<!--           <ShowPdfButton
            :syllabus="syllabus"
            :title="isValid ? 'Vore PDF' : 'Vore esborrany'"
            @waiting="isLoading = $event"
          ></ShowPdfButton> -->
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
    <ModalComponent @save="getExcel" title="Quadern del professorat">
      <div class="row p-1 align-items-center">
        <p>Pega la llista d'alumnes separats per <strong>punt i coma</strong></p>
        <div>
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
