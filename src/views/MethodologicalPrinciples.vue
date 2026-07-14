<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import ShowTable from '@/components/ShowTable.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'
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
export default {
  components: {
    AppBreadcrumb,
    ShowTable,
    ModalComponent
  },
  computed: {
    ...mapState(useDataStore, ['syllabus']),
    methodologicalPrinciplesSourceLabel() {
      if (this.methodologicalPrinciplesSource === 'pcc') return 'PCC'
      if (this.methodologicalPrinciplesSource === 'center') return 'centre'
      return 'no indicat'
    },
    availableOptionalMethodologicalPrinciples() {
      return this.methodologicalPrinciplesCheckeables.filter((item) => !item.checked)
    },
    mandatoryPrinciplesPending() {
      const selectedIds = this.syllabusMethodologicalPrinciples.map((item) => item.id)
      return this.methodologicalPrinciples.mandatory.filter(
        (principle) => !selectedIds.includes(principle.id)
      )
    },
    isMethodologicalPrinciplesStep() {
      return this.$route.name === 'MethodologicalPrinciples'
    },
    isActivitiesMaterialsStep() {
      return this.$route.name === 'ActivitiesMaterials'
    },
    breadcrumbStep() {
      return this.isMethodologicalPrinciplesStep ? 5 : 10
    }
  },
  mounted() {
    if (this.syllabus.id) {
      this.loadData()
    }
    this.initializeModals()
  },
  watch: {
    'syllabus.id': 'loadData',
    '$route.name': 'initializeModals'
  },
  data() {
    return {
      complementaryActivColumns,
      methodologicalPrinciples: {
        mandatory: [],
        available: []
      },
      methodologicalPrinciplesSource: '',
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
    initializeModals() {
      this.$nextTick(() => {
        const activitiesModal = document.getElementById('complementaryActivitiesModal')
        const principlesModal = document.getElementById('methodologicalPrinciples')
        const materialsModal = document.getElementById('materialsModal')
        this.ActivitiesModal = activitiesModal ? new Modal(activitiesModal) : null
        this.PrinciplesModal = principlesModal ? new Modal(principlesModal) : null
        this.MaterialsModal = materialsModal ? new Modal(materialsModal) : null
      })
    },
    async loadData() {
      try {
        const response = await api.getAvailableSyllabusMethodologicalPrinciples(this.syllabus.id)
        this.setMethodologicalPrinciplesData(response.data)
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    setMethodologicalPrinciplesData(data) {
      const available = data?.available || []
      this.methodologicalPrinciplesSource = data?.source || ''
      this.methodologicalPrinciples = {
        mandatory: data?.mandatory || available.filter((item) => item.mandatory),
        available
      }
      this.syllabusMethodologicalPrinciples = available.filter((item) => item.selected)
      this.setMethodologicalPrinciplesCheckeables()
    },
    setMethodologicalPrinciplesCheckeables() {
      this.methodologicalPrinciplesCheckeables = this.methodologicalPrinciples.available.map((item) => ({
        ...item,
        checked: item.selected
      }))
    },
    applySelectedMethodologicalPrinciples(principleIds) {
      const selectedIds = new Set(principleIds)
      this.methodologicalPrinciples.available = this.methodologicalPrinciples.available.map((item) => ({
        ...item,
        selected: selectedIds.has(item.id)
      }))
      this.syllabusMethodologicalPrinciples = this.methodologicalPrinciples.available.filter(
        (item) => item.selected
      )
      this.setMethodologicalPrinciplesCheckeables()
    },
    isMandatoryPrinciple(principleId) {
      return this.methodologicalPrinciples.mandatory.some((item) => item.id === principleId)
    },
    getSelectedPrincipleIds() {
      return this.methodologicalPrinciples.available
        .filter((item) => item.selected)
        .map((item) => item.id)
    },
    async saveSelectedMethodologicalPrinciples(principleIds) {
      const selectedPrincipleIds = [...new Set(principleIds)]
      await api.saveMethodologicalPrinciples(this.syllabus.id, {
        methodologicalPrinciples: selectedPrincipleIds
      })
      const response = await api.getAvailableSyllabusMethodologicalPrinciples(this.syllabus.id)
      this.setMethodologicalPrinciplesData(response.data)
      this.applySelectedMethodologicalPrinciples(selectedPrincipleIds)
    },
    async addMethodologicalPrinciple(principle) {
      try {
        await this.saveSelectedMethodologicalPrinciples([
          ...this.getSelectedPrincipleIds(),
          principle.id
        ])
        this.addMessage('success', 'Principi metodològic afegit')
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async deleteMethodologicalPrinciple(principle) {
      if (!confirm(`Vas a llevar el principi metodològic "${principle.name}" de la programació`)) {
        return
      }
      try {
        await this.saveSelectedMethodologicalPrinciples(
          this.getSelectedPrincipleIds().filter((id) => id !== principle.id)
        )
        this.addMessage('success', 'Principi metodològic eliminat')
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    getPrincipleCategory(principle) {
      const translations = {
        principle: 'Principi Metodològic',
        focus: 'Enfocament',
        methodology: 'Metodología'
      }
      return translations[principle?.category] || principle?.category || ''
    },
    getCategoryBadgeClass(category) {
      switch (category) {
        case 'principle':
          return 'bg-primary'
        case 'focus':
          return 'bg-warning text-dark'
        case 'methodology':
          return 'bg-success'
        default:
          return 'bg-info text-dark'
      }
    },
    showModal(type, data) {
      switch (type) {
        case 'principles':
          this.setMethodologicalPrinciplesCheckeables()
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
            this.modalTitle = 'Afegir nova activitat complementària'
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
      v-if="isMethodologicalPrinciplesStep"
      title="Afegir principis metodològics"
      modalId="methodologicalPrinciples"
      :save-button="false"
    >
      <h4>Principis metodològics disponibles per afegir</h4>
      <p class="text-muted">
        Usa el botó <strong>+</strong> per afegir una metodologia a la programació. Les obligatòries
        apareixen marcades amb el seu origen.
      </p>
      <div class="card mb-2">
        <div class="card-header fw-bold text-center">Disponibles per afegir</div>
        <ul class="list-group list-group-flush principles-list">
          <li
            v-if="availableOptionalMethodologicalPrinciples.length === 0"
            class="list-group-item text-muted"
          >
            No hi ha metodologies disponibles per afegir
          </li>
          <li
            v-for="principle in availableOptionalMethodologicalPrinciples"
            :key="principle.id"
            class="list-group-item"
          >
            <div class="principle-row d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 principle-title-row">
                  <strong class="principle-title">{{ principle.name }}</strong>
                  <span
                    v-if="getPrincipleCategory(principle)"
                    class="badge"
                    :class="getCategoryBadgeClass(principle.category)"
                  >
                    {{ getPrincipleCategory(principle) }}
                  </span>
                  <span v-if="isMandatoryPrinciple(principle.id)" class="badge bg-danger">
                    Obligatòria: {{ methodologicalPrinciplesSourceLabel }}
                  </span>
                </div>
                <div v-if="principle.description" class="text-muted small mt-1">
                  {{ principle.description }}
                </div>
              </div>
              <button
                type="button"
                class="btn btn-sm btn-primary"
                title="Afegir a la selecció"
                @click="addMethodologicalPrinciple(principle)"
              >
                <i class="bi bi-plus-circle"></i>
              </button>
            </div>
          </li>
        </ul>
      </div>
    </ModalComponent>
    <ModalComponent
      v-if="isActivitiesMaterialsStep"
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
    <ModalComponent
      v-if="isActivitiesMaterialsStep"
      @save="saveContents"
      :title="modalTitle"
      modalId="complementaryActivitiesModal"
    >
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
    <app-breadcrumb :actualStep="breadcrumbStep" :done="true"></app-breadcrumb>
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ syllabus.module?.name }} ({{
        syllabus.turn === 'presential' ? 'Presencial' : 'Semi-presencial'
      }}) - {{ syllabus.courseYear }}
    </div>
    <div class="p-lg-4 p-1 p-sm-0">
      <template v-if="isActivitiesMaterialsStep">
      <h2>10. Activitats complementàries i Recursos didàctics</h2>
      <h3>10.a Activitats complementàries</h3>
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
      </template>
      <template v-if="isMethodologicalPrinciplesStep">
        <h2>5. Principis metodològics</h2>
        <h3>5.a Principis metodològics</h3>
        <div v-if="mandatoryPrinciplesPending.length" class="alert alert-warning" role="alert">
          <strong>Falten principis metodològics obligatoris per afegir.</strong>
          <div class="mt-2">
            <span>Obligatoris pendents segons {{ methodologicalPrinciplesSourceLabel }}:</span>
            <ul class="mb-0">
              <li v-for="principle in mandatoryPrinciplesPending" :key="principle.id">
                {{ principle.name }}
              </li>
            </ul>
          </div>
        </div>
        <div v-else class="alert alert-success" role="alert">
          Tots els principis metodològics obligatoris estan afegits.
        </div>
        <ul class="list-group list-group-flush principles-list border border-black">
        <li v-if="syllabusMethodologicalPrinciples.length === 0" class="list-group-item text-muted">
          Encara no hi ha principis metodològics afegits
        </li>
        <li
          v-for="principle in syllabusMethodologicalPrinciples"
          :key="principle.id"
          class="list-group-item"
        >
          <div class="principle-row d-flex justify-content-between align-items-start">
            <div class="d-flex align-items-start flex-grow-1 principle-row">
              <i class="bi bi-check-circle-fill text-success mt-1" title="Afegit"></i>
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 principle-title-row">
                  <strong class="principle-title">{{ principle.name }}</strong>
                  <span
                    v-if="getPrincipleCategory(principle)"
                    class="badge"
                    :class="getCategoryBadgeClass(principle.category)"
                  >
                    {{ getPrincipleCategory(principle) }}
                  </span>
                  <span v-if="isMandatoryPrinciple(principle.id)" class="badge bg-danger">
                    Obligatòria: {{ methodologicalPrinciplesSourceLabel }}
                  </span>
                </div>
                <div v-if="principle.description" class="text-muted small mt-1">
                  {{ principle.description }}
                </div>
              </div>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              title="Llevar de la programació"
              @click="deleteMethodologicalPrinciple(principle)"
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </li>
      </ul>
      <div class="m-2 text-center">
        <button
          type="button"
          class="btn btn-success"
          title="Afegir activitat"
          @click="showModal('principles')"
        >
          Afegir criteris metodològics
        </button>
      </div>
      </template>
      <template v-if="isActivitiesMaterialsStep">
      <br /><br />
      <h3>10.b Materials i recursos didàctics</h3>
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
      </template>
    </div>
  </main>
</template>

<style scoped>
.principle-row {
  gap: 0.75rem;
}

.principle-title-row {
  flex-wrap: wrap;
}

.principle-title {
  word-break: break-word;
}
</style>
