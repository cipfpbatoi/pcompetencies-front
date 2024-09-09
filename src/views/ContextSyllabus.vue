<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import * as yup from 'yup'
import { object } from 'yup'
import { validateFormErrors } from '../utils/utils.js'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

const validationSchema = object({
  groupContext: yup
    .string()
    .trim()
    .required('Has de posar la contextualització de la programació')
    .min(20, 'Al menys han de tindre 20 caracters')
})

export default {
  components: {
    AppBreadcrumb,
    ModalComponent
  },
  computed: {
    ...mapState(useDataStore, ['syllabus']),
    done() {
      return !!this.syllabus.groupContext
    },
    centerContextualization() {
      return this.showAll.center
        ? this.syllabus.center?.contextualization
        : this.syllabus.center?.contextualization.substr(0, 200) + '...'
    },
    cycleContextualization() {
      return this.showAll.cycle
        ? this.syllabus.cycleCenterContext?.studentsProfile
        : this.syllabus.cycleCenterContext?.studentsProfile.substr(0, 200) + '...'
    }
  },
  mounted() {
    this.modalFields.groupContext = this.syllabus.groupContext
    this.GenericModal = new Modal(document.getElementById('unitMmodalComp'))
  },
  watch: {
    'syllabus.groupContext'(newValue) {
      this.modalFields.groupContext = newValue
    }
  },
  data() {
    return {
      errors: {},
      GenericModal: null,
      modalFields: {},
      showAll: {
        center: false,
        cycle: false
      },
      // CKEditor
      editor: ClassicEditor,
      editorConfig: {
        // The configuration of the editor.
      }
    }
  },
  methods: {
    ...mapActions(useDataStore, ['saveSyllabusGroupContext']),
    showModal() {
      this.GenericModal.show()
    },
    toogleShowAll(type) {
      this.showAll[type] = !this.showAll[type]
    },
    async saveData() {
      this.errors = await validateFormErrors(validationSchema, this.modalFields)
      if (Object.keys(this.errors).length) return

      const response = await this.saveSyllabusGroupContext(this.syllabus.id, {
        groupContext: this.modalFields.groupContext
      })
      if (response === 'ok') {
        this.syllabus.groupContext = this.modalFields.groupContext
        this.GenericModal.hide()
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
  <main class="border shadow view-main">
    <ModalComponent @save="saveData" title="Característiques del grup-classe">
      <div class="row p-2 text-center">
        <ckeditor
          :editor="editor"
          v-model="modalFields.groupContext"
          :config="editorConfig"
        ></ckeditor>
        <p v-if="errors.groupContext" class="error">{{ errors.groupContext }}</p>
      </div>
    </ModalComponent>
    <app-breadcrumb :actualStep="1" :done="done"></app-breadcrumb>
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">{{ syllabus.module?.name }} ({{ (syllabus.turn === 'presential') ? 'Presencial' : 'Semi-presencial'  }}) - {{ syllabus.courseYear }}</div>
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>1. Contextualització</h2>
      <div class="card text-center mb-2">
        <div class="card-header fw-bold bg-info text-uppercase text-white text-start">
          1.1 Característiques del Centre i l'entorn
        </div>
        <div class="card-body bg-secondary-subtle text-muted text-start">
          <p v-html="centerContextualization"></p>
        </div>
        <div class="card-footer text-muted">
          <button @click="toogleShowAll('center')" class="btn btn-primary btn-sm">
            Mostrar {{ showAll.center ? 'menys' : 'tot' }}
          </button>
        </div>
      </div>
      <div class="card text-center mb-2">
        <div class="card-header fw-bold bg-info text-uppercase text-white text-start">
          1.2 Característiques de l'alumnat
        </div>
        <div class="card-body bg-secondary-subtle text-muted">
          <p class="text-start"
            v-if="syllabus.cycleCenterContext?.studentsProfile"
            v-html="cycleContextualization">
          </p>
          <p class="bg-secondary-subtle" v-else>
            El departament ha d'establir una contextualització per al cicle
          </p>
        </div>
        <div class="card-footer text-muted">
          <button @click="toogleShowAll('cycle')" class="btn btn-primary btn-sm">
            Mostrar {{ showAll.cycle ? 'menys' : 'tot' }}
          </button>
        </div>
      </div>
      <div class="card text-center mb-2">
        <div class="card-header fw-bold bg-info text-uppercase text-white text-start">
          1.3 Característiques del grup-classe
        </div>
        <div class="card-body">
          <p class="text-start" v-if="syllabus.groupContext" v-html="syllabus.groupContext"></p>
          <p v-else>
            Ha d'indicar les característiques generals del grup-clase (Número de alumnes, posibles
            dificultats amb l'idioma,...)
          </p>
        </div>
        <div class="card-footer text-muted">
          <button @click="showModal()" class="btn btn-success" title=" Afegir/Modificar característiques del grup-classe">
            Afegir/Modificar característiques del grup-classe
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.error {
  color: red;
}
</style>
