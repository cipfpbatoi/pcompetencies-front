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
    this.PrinciplesModal = new Modal(document.getElementById('methodologicalPrinciples'))
    this.MaterialsModal = new Modal(document.getElementById('materialsModal'))
  },
  watch: {
    'syllabus.id': 'loadData'
  },
  data() {
    return {
      methodologicalPrinciplesColumns,
      methodologicalPrinciples: [],
      syllabusMethodologicalPrinciples: [],
      methodologicalPrinciplesCheckeables: [],
      // Modal generic
      errors: {},
      modalFields: {},
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
    showModal(type) {
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
      title="Materials i recursos didàctics"
      modalId="materialsModal"
    >
      <div class="row">
        <h5>Materials didàctics</h5>
        <p>
          Són aquells que s'han el·laborat exclusivament amb l'intenció de facilitar els processos
          d'ensenyament-aprenentatge. Ex.- llibres, documentació propia, enunciats del problemes,
          quaderns de pràctiques, presentacions...
        </p>
        <ckeditor
          :editor="editor"
          v-model="modalFields.didacticMaterial"
          :config="editorConfig"
        ></ckeditor>
        <p v-if="errors.didacticMaterial" class="error">{{ errors.didacticMaterial }}</p>
        <h5>Recursos didàctics</h5>
        <p>
          Són els materials i eines utilitzats en el context educatiu per a facilitar el
          desenvolupament de les activitats formatives. Ex.- plataforma Aules, ordinadors del
          centre, software...
        </p>
        <ckeditor
          :editor="editor"
          v-model="modalFields.didacticResources"
          :config="editorConfig"
        ></ckeditor>
        <p v-if="errors.didacticResources" class="error">{{ errors.didacticResources }}</p>
      </div>
    </ModalComponent>
    <app-breadcrumb :actualStep="9" :done="true"></app-breadcrumb>
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ syllabus.module?.name }} ({{
        syllabus.turn === 'presential' ? 'Presencial' : 'Semi-presencial'
      }}) - {{ syllabus.courseYear }}
    </div>
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>9. Principis metodològics i recursos didàctics</h2>
      <h3>Principis metodològics</h3>
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
      <h3>Materials i recursos didàctics</h3>
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
