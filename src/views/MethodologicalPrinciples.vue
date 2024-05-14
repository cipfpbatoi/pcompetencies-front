<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import ShowTable from '@/components/ShowTable.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'
import { makeCheckeableArray, getObjectsIds } from '../utils/utils.js'

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
  async mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
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
    this.GenericModal = new Modal(document.getElementById('methodologicalPrinciples'))
  },
  data() {
    return {
      methodologicalPrinciplesColumns,
      methodologicalPrinciples: [],
      syllabusMethodologicalPrinciples: [],
      methodologicalPrinciplesCheckeables: [],
      // Modal generic
      GenericModal: null,
      modalFields: {}
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    showModal() {
      this.methodologicalPrinciplesCheckeables = makeCheckeableArray(
        this.methodologicalPrinciples.nonMandatory,
        this.syllabusMethodologicalPrinciples
      )
      this.modalFields = { methodologicalPrinciples: this.methodologicalPrinciples }
      this.GenericModal.show()
    },
    async saveData() {
      const principlesChecked = this.methodologicalPrinciplesCheckeables.filter(
        (item) => item.checked
      )
      try {
        const response = await api.saveMethodologicalPrinciples(this.syllabus.id, {
          methodologicalPrinciples: getObjectsIds(principlesChecked)
        })
        this.syllabusMethodologicalPrinciples = response.data
        this.GenericModal.hide()
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
      @save="saveData"
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
    <app-breadcrumb :actualStep="9" :done="true"></app-breadcrumb>
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }}) - {{ syllabus.courseYear }}</h2>
      <h2>9. Principis metodològics</h2>
      <div class="border border-black">
        <show-table :data="syllabusMethodologicalPrinciples" :columns="methodologicalPrinciplesColumns"
        :actions="false">
        </show-table>
      </div>
      <button type="button" class="btn btn-secondary" title="Afegir activitat" @click="showModal">
        Modificar els criteris metodològics
      </button>
      <br />
    </div>
  </main>
</template>
