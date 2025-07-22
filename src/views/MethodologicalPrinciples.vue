<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import ShowTable from '@/components/ShowTable.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'
import { makeCheckeableArray, getObjectsIds } from '../utils/utils.js'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

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
const methodologicalPrinciplesColumns = [
  {
    title: 'Nom',
    value: 'name'
  },
  {
    title: 'Descripció',
    value: 'description'
  }
]

export default {
  components: {
    AppBreadcrumb,
    ShowTable,
    ModalComponent
  },
  computed: {
    ...mapState(useDataStore, ['syllabus']),
    methodologicalPrinciplesMandatoryColumns() {
      return [
        {
          title: 'Sel.',
          func: () => '<input type="checkbox" checked disabled>',
          param: 'code',
          html: true
        },
        ...methodologicalPrinciplesColumns
      ]
    }
  },
  mounted() {
    if (this.syllabus.id) {
      this.loadData()
    }
    this.ActivitiesModal = new Modal(document.getElementById('complementaryActivitiesModal'))
    this.PrinciplesModal = new Modal(document.getElementById('methodologicalPrinciples'))
    this.MaterialsModal = new Modal(document.getElementById('materialsModal'))
  },
  watch: {
    'syllabus.id': 'loadData'
  },
  data() {
    return {
      complementaryActivColumns,
      methodologicalPrinciplesColumns,
      methodologicalPrinciples: [],
      syllabusMethodologicalPrinciples: [],
      methodologicalPrinciplesCheckeables: [],
      // Modal generic
      errors: {},
      modalFields: {},
      modalTitle: '',
      newContent: '',
      ActivitiesModal: null,
      PrinciplesModal: null,
      MaterialsModal: null,
      // CKEditor
      editor: ClassicEditor,
      editorConfig: {
        // The configuration of the editor.
      }
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    async loadData() {
      try {
        const [respMP, respSMP] = await Promise.all([
          api.getMethodologicalPrinciples(),
          api.getSyllabusMethodologicalPrinciples(this.syllabus.id)
        ])
        this.methodologicalPrinciples = respMP.data
        this.syllabusMethodologicalPrinciples = respSMP.data
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    showModal(type, data) {
      switch (type) {
        case 'principles':
          this.methodologicalPrinciplesCheckeables = makeCheckeableArray(
            this.methodologicalPrinciples.nonMandatory,
            this.syllabusMethodologicalPrinciples
          )
          this.PrinciplesModal.show()
          break
        case 'materials':
          this.modalFields.didacticMaterial = this.syllabus.didacticMaterial || ''
          this.modalFields.didacticResources = this.syllabus.didacticResources || ''
          this.MaterialsModal.show()
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
    },
    async savePrinciples() {
      const principlesChecked = this.methodologicalPrinciplesCheckeables.filter(
        (item) => item.checked
      )
      try {
        const response = await api.saveMethodologicalPrinciples(this.syllabus.id, {
          methodologicalPrinciples: getObjectsIds(principlesChecked)
        })
        this.syllabusMethodologicalPrinciples = response.data
        this.PrinciplesModal.hide()
        this.addMessage('success', 'Principis metodològics guardats')
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async saveMaterials() {
      try {
        const response = await api.saveSyllabusMaterials(this.syllabus.id, {
          didacticMaterial: this.modalFields.didacticMaterial,
          didacticResources: this.modalFields.didacticResources
        })
        this.syllabus.didacticMaterial = response.data.didacticMaterial
        this.syllabus.didacticResources = response.data.didacticResources
        this.MaterialsModal.hide()
        this.addMessage('success', 'Principis metodològics guardats')
      } catch (error) {
        this.addMessage('error', error)
      }
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <ModalComponent
      @save="savePrinciples"
      title="Modificar els principis metodològics"
      modalId="methodologicalPrinciples"
    >
      <h4>Principis metodològics obligatoris</h4>
      <ShowTable
        :data="methodologicalPrinciples.mandatory"
        :columns="methodologicalPrinciplesMandatoryColumns"
        :actions="false"
      >
      </ShowTable>
      <h4>Altres principis metodològics que vaig a utilitzar</h4>
      <ShowTable
        :checkeable="true"
        :data="methodologicalPrinciplesCheckeables"
        :columns="methodologicalPrinciplesColumns"
        :actions="false"
      >
      </ShowTable>
    </ModalComponent>
    <ModalComponent
      @save="saveMaterials"
      title=" Materials i recursos didàctics"
      modalId="materialsModal"
    >
      <div>
        <h5>Materials didàctics</h5>
        <div class="alert-info alert m-1 p-1 mb-2">
          <p class="m-2">
            <i class="bi bi-eye-fill m-1"></i>
            Són aquells que s'han el·laborat exclusivament amb l'intenció de facilitar els processos
            d'ensenyament-aprenentatge. Ex.- llibres, documentació propia, enunciats del problemes,
            quaderns de pràctiques, presentacions...
          </p>
        </div>
        <div class="col-12">
          <ckeditor
            :editor="editor"
            v-model="modalFields.didacticMaterial"
            :config="editorConfig"
          ></ckeditor>
          <p v-if="errors.didacticMaterial" class="error">{{ errors.didacticMaterial }}</p>
        </div>
      </div>
      <div class="mt-2">
        <h5>Recursos didàctics</h5>
        <div class="alert-info alert m-1 p-1 mb-2">
          <p class="m-2">
            <i class="bi bi-eye-fill m-1"></i> Són els materials i eines utilitzats en el context
            educatiu per a facilitar el desenvolupament de les activitats formatives. Ex.-
            plataforma Aules, ordinadors del centre, software...
          </p>
        </div>
        <div class="col-12">
          <ckeditor
            :editor="editor"
            v-model="modalFields.didacticResources"
            :config="editorConfig"
          ></ckeditor>
          <p v-if="errors.didacticResources" class="error">{{ errors.didacticResources }}</p>
        </div>
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
    <app-breadcrumb :actualStep="9" :done="true"></app-breadcrumb>
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ syllabus.module?.name }} ({{
        syllabus.turn === 'presential' ? 'Presencial' : 'Semi-presencial'
      }}) - {{ syllabus.courseYear }}
    </div>
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>9. Activitats complementàries, Principis metodològics i Recursos didàctics</h2>
      <h3>9.a Activitats complementàries</h3>
      <div class="alert alert-primary text-dark" role="alert">
        <span class="bi bi-eye-fill"></span> Són les organitzades en horari escolar y que es
        diferèncien de les lectives pel moment, espais o recursos que utilitzen. <br /><cite
          class="text-secondary"
          >Si has de qualificar-les has d'afegir-les també com a activitat de qualificació en la SA
          on es durà a terme.</cite
        >
      </div>
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
      <h3>9.b Principis metodològics</h3>
      <div class="border border-black">
        <show-table
          :data="syllabusMethodologicalPrinciples"
          :columns="methodologicalPrinciplesColumns"
          :actions="false"
        >
        </show-table>
      </div>
      <div class="m-2 text-center">
        <button
          type="button"
          class="btn btn-success"
          title="Afegir activitat"
          @click="showModal('principles')"
        >
          Modificar els criteris metodològics
        </button>
      </div>
      <br /><br />
      <h3>9.c Materials i recursos didàctics</h3>
      <h4>Materials didàctics</h4>
      <p>
        Són aquells que s'han el·laborat exclusivament amb l'intenció de facilitar els processos
        d'ensenyament-aprenentatge. Ex.- llibres, documentació propia, enunciats del problemes,
        quaderns de pràctiques, presentacions...
      </p>
      <div class="border border-black">
        <p v-html="syllabus.didacticMaterial"></p>
      </div>
      <br />
      <h4>Recursos didàctics</h4>
      <p>
        Són els materials i eines utilitzats en el context educatiu per a facilitar el
        desenvolupament de les activitats formatives. Ex.- plataforma Aules, ordinadors del centre,
        software...
      </p>
      <div class="border border-black">
        <p v-html="syllabus.didacticResources"></p>
      </div>
      <div class="m-2 text-center">
        <button
          type="button"
          class="btn btn-success"
          title="Afegir activitat"
          @click="showModal('materials')"
        >
          Modificar els materials i recursos didàctics
        </button>
      </div>
      <br />
    </div>
  </main>
</template>
