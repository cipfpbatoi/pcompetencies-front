<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import * as yup from 'yup'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

// Components
import ModalComponent from '@/components/ModalComp.vue'
import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'

// Store
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

// Composables
import { useFormValidation } from '@/composables/useFormValidation'

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)
const { savePccSustainabilityCriteria, savePccComplementaryCriteria } = store

// Validación
const sustainabilitySchema = yup.object({
  sustainabilityCriteria: yup
    .string()
    .trim()
    .required("Has de posar els criteris d'adaptació dels mòduls")
    .min(20, 'Al menys han de tindre 20 caràcters')
})

const complementarySchema = yup.object({
  complementaryCriteria: yup
    .string()
    .trim()
    .required('Has de posar els criteris per a les activitats complementàries')
    .min(20, 'Al menys han de tindre 20 caràcters')
})

const {
  errors: sustainabilityErrors,
  validate: validateSustainability,
  handleServerError: handleSustServerError,
  clearErrors: clearSustErrors
} = useFormValidation(sustainabilitySchema)

const {
  errors: complementaryErrors,
  validate: validateComplementary,
  handleServerError: handleCompServerError,
  clearErrors: clearCompErrors
} = useFormValidation(complementarySchema)

// Estado local
const modalFields = reactive({
  sustainabilityCriteria: '',
  complementaryCriteria: ''
})

// CKEditor
const editor = ClassicEditor
const editorConfig = {
  toolbar: [
    'heading',
    '|',
    'bold',
    'italic',
    'link',
    'bulletedList',
    'numberedList',
    '|',
    'blockQuote',
    'insertTable',
    '|',
    'undo',
    'redo'
  ],
  language: 'ca'
}

// Computed
const isDone = computed(() => {
  return !!(
    pcc.value.criteriaAdaptingSostenibilityAndDigitalModules &&
    pcc.value.criteriaForComplementaryAndExtraActivities
  )
})

// Lifecycle
onMounted(() => {
  modalFields.sustainabilityCriteria =
    pcc.value.criteriaAdaptingSostenibilityAndDigitalModules || ''
  modalFields.complementaryCriteria = pcc.value.criteriaForComplementaryAndExtraActivities || ''
})

// Modales
const sustainabilityModalRef = ref(null)
const complementaryModalRef = ref(null)
const showSustainabilityHelp = ref(false)
const showComplementaryHelp = ref(false)

const modalRefs = {
  sustainability: sustainabilityModalRef,
  complementary: complementaryModalRef
}

const modalsConfig = {
  sustainability: {
    modalId: 'sustainabilityModal',
    title: "7.1 Criteris d'adaptació dels mòduls de Sostenibilitat i Digitalització",
    size: 'lg'
  },
  complementary: {
    modalId: 'complementaryModal',
    title: '7.2 Criteris per a planificar les activitats complementàries i extraescolars',
    size: 'lg'
  }
}

const showModal = (key) => {
  if (key === 'sustainability') {
    modalFields.sustainabilityCriteria =
      pcc.value.criteriaAdaptingSostenibilityAndDigitalModules || ''
  }
  if (key === 'complementary') {
    modalFields.complementaryCriteria = pcc.value.criteriaForComplementaryAndExtraActivities || ''
  }
  modalRefs[key].value?.show()
}
const hideModal = (key) => modalRefs[key].value?.hide()

const sustainabilityHelpContent = {
  title: "Ajuda - 7.1 Criteris d'adaptació dels mòduls de Sostenibilitat i Digitalització",
  body: 'En aquest apartat cal descriure de manera concreta com s’incorporaran els continguts de Digitalització i Sostenibilitat en els mòduls del cicle.\n\nLa redacció ha d’especificar quines eines, procediments, normatives o pràctiques professionals s’utilitzaran, com es treballaran a l’aula o en l’entorn productiu i de quina manera es tindran en compte en l’avaluació. Eviteu formulacions genèriques.\n\n<div class="help-list"><ul><li>La digitalització s’integrarà mitjançant l’ús de…</li><li>Es treballaran procediments digitals com…</li><li>En relació amb la sostenibilitat, s’aplicaran criteris de…</li><li>Aquesta integració es reflectirà en l’avaluació a través de…</li></ul></div>\n\n<div class="help-quote-label"><strong>Exemple (àmbit sanitari)</strong></div><blockquote class="help-quote">La digitalització s’aplicarà mitjançant l’ús de programari de gestió de pacients i recepta electrònica, amb especial atenció a la protecció de dades i a la seguretat de la informació. En sostenibilitat, es treballarà la segregació de residus biosanitaris i l’optimització de materials segons els protocols ambientals del sector.</blockquote>'
}
const sustainabilityHelpParagraphs = computed(() => {
  if (!sustainabilityHelpContent.body) return []
  return sustainabilityHelpContent.body.split('\n\n').filter(Boolean)
})

const toggleSustainabilityHelp = () => {
  showSustainabilityHelp.value = !showSustainabilityHelp.value
}

const closeSustainabilityHelp = () => {
  showSustainabilityHelp.value = false
}

const complementaryHelpContent = {
  title: 'Ajuda - 7.2 Criteris per a planificar les activitats complementàries i extraescolars',
  body: 'En aquest apartat cal descriure els criteris que orientaran la proposta d’activitats complementàries i extraescolars al llarg del cicle.\n\nLa redacció ha d’indicar quin tipus d’activitats es prioritzaran, la seua relació amb el perfil professional, així com la manera en què contribuiran al desenvolupament de competències. Eviteu limitar-vos a enumerar eixides; cal justificar la seua finalitat educativa.\n\n<div class="help-list"><ul><li>Es prioritzaran activitats orientades a…</li><li>Les eixides permetran a l’alumnat…</li><li>Aquestes actuacions reforçaran…</li><li>La participació en… contribuirà a…</li></ul></div>\n\n<div class="help-quote-label"><strong>Exemple</strong></div><blockquote class="help-quote">Dins del marc del projecte d’Aprenentatge Servei es preveu la realització d’activitats complementàries, com eixides puntuals a diferents centres, per dur a terme actuacions preparades prèviament a l’aula i afavorir l’aplicació pràctica de les competències professionals.</blockquote>'
}
const complementaryHelpParagraphs = computed(() => {
  if (!complementaryHelpContent.body) return []
  return complementaryHelpContent.body.split('\n\n').filter(Boolean)
})

const toggleComplementaryHelp = () => {
  showComplementaryHelp.value = !showComplementaryHelp.value
}

const closeComplementaryHelp = () => {
  showComplementaryHelp.value = false
}

const handleModalClose = (key) => {
  if (key === 'sustainability') clearSustErrors()
  if (key === 'complementary') clearCompErrors()
}

// Guardado
const saveSustainabilityData = async () => {
  const isValid = await validateSustainability({
    sustainabilityCriteria: modalFields.sustainabilityCriteria
  })
  if (!isValid) return

  try {
    const response = await savePccSustainabilityCriteria(
      pcc.value.id,
      modalFields.sustainabilityCriteria
    )
    if (response === 'ok') {
      hideModal('sustainability')
      clearSustErrors()
    } else {
      handleSustServerError(response)
    }
  } catch (error) {
    handleSustServerError(error)
  }
}

const saveComplementaryData = async () => {
  const isValid = await validateComplementary({
    complementaryCriteria: modalFields.complementaryCriteria
  })
  if (!isValid) return

  try {
    const response = await savePccComplementaryCriteria(
      pcc.value.id,
      modalFields.complementaryCriteria
    )
    if (response === 'ok') {
      hideModal('complementary')
      clearCompErrors()
    } else {
      handleCompServerError(response)
    }
  } catch (error) {
    handleCompServerError(error)
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <!-- Modal Sostenibilitat -->
    <ModalComponent
      ref="sustainabilityModalRef"
      v-bind="modalsConfig.sustainability"
      @save="saveSustainabilityData"
      @close="handleModalClose('sustainability')"
    >
      <div class="p-2">
        <ckeditor
          class="w-100"
          :editor="editor"
          v-model="modalFields.sustainabilityCriteria"
          :config="editorConfig"
        />
        <p v-if="sustainabilityErrors.sustainabilityCriteria" class="error mt-2">
          {{ sustainabilityErrors.sustainabilityCriteria }}
        </p>
      </div>
    </ModalComponent>

    <!-- Modal Complementàries -->
    <ModalComponent
      ref="complementaryModalRef"
      v-bind="modalsConfig.complementary"
      @save="saveComplementaryData"
      @close="handleModalClose('complementary')"
    >
      <div class="p-2">
        <ckeditor
          class="w-100"
          :editor="editor"
          v-model="modalFields.complementaryCriteria"
          :config="editorConfig"
        />
        <p v-if="complementaryErrors.complementaryCriteria" class="error mt-2">
          {{ complementaryErrors.complementaryCriteria }}
        </p>
      </div>
    </ModalComponent>

    <!-- Breadcrumb -->
    <AppBreadcrumb :actualStep="7" :done="isDone" />

    <!-- Header -->
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <!-- Contenido -->
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>7. Criteris d'adaptació i activitats</h2>

      <!-- 7.1 Sostenibilitat -->
      <div class="card text-center mb-2">
        <div class="card-header pcc fw-bold text-uppercase text-white text-start">
          7.1 Criteris d'adaptació dels mòduls de Sostenibilitat i Digitalització
          <span
            @click="toggleSustainabilityHelp"
            class="cursor-pointer ms-2 help-icon"
            role="button"
            tabindex="0"
          >
            <i class="bi bi-info-circle-fill text-info" />
          </span>
        </div>
        <div class="card-body">
          <p
            v-if="pcc.criteriaAdaptingSostenibilityAndDigitalModules"
            class="text-start"
            v-html="pcc.criteriaAdaptingSostenibilityAndDigitalModules"
          />
          <p v-else>
            Has d'indicar els criteris d'adaptació dels mòduls de Sostenibilitat aplicable a
            l'entorn productiu i Digitalització aplicada al sistema productiu
          </p>
        </div>
        <div class="card-footer text-muted">
          <button
            @click="showModal('sustainability')"
            class="btn btn-success"
            title="Afegir/Modificar criteris d'adaptació"
          >
            <i class="bi bi-pencil-fill me-2" />
            Afegir/Modificar criteris d'adaptació
          </button>
        </div>
      </div>

      <!-- 7.2 Activitats complementàries -->
      <div class="card text-center mb-2">
        <div class="card-header pcc fw-bold text-uppercase text-white text-start">
          7.2 Criteris per a planificar les activitats complementàries i extraescolars
          <span
            @click="toggleComplementaryHelp"
            class="cursor-pointer ms-2 help-icon"
            role="button"
            tabindex="0"
          >
            <i class="bi bi-info-circle-fill text-info" />
          </span>
        </div>
        <div class="card-body">
          <p
            v-if="pcc.criteriaForComplementaryAndExtraActivities"
            class="text-start"
            v-html="pcc.criteriaForComplementaryAndExtraActivities"
          />
          <p v-else>
            Has d'indicar els criteris per a la planificació de les activitats complementàries i
            extraescolars
          </p>
        </div>
        <div class="card-footer text-muted">
          <button
            @click="showModal('complementary')"
            class="btn btn-success"
            title="Afegir/Modificar criteris d'activitats complementàries"
          >
            <i class="bi bi-pencil-fill me-2" />
            Afegir/Modificar criteris d'activitats
          </button>
        </div>
      </div>
    </div>
  </main>

  <Teleport to="body">
    <div v-if="showSustainabilityHelp">
      <div class="modal d-block modal-lg" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title mx-auto">
                <i class="bi bi-info-circle-fill me-2" />
                {{ sustainabilityHelpContent.title }}
              </h5>
            </div>
            <div class="modal-body">
              <p v-if="sustainabilityHelpParagraphs.length === 0" class="text-muted">
                No hi ha contingut d'ajuda disponible.
              </p>
              <div
                v-for="(paragraph, index) in sustainabilityHelpParagraphs"
                :key="index"
                class="text-muted mb-3"
                v-html="paragraph"
              />
            </div>
            <div class="modal-footer mx-auto">
              <button
                type="button"
                class="btn btn-info btn-lg help-close-btn"
                @click="closeSustainabilityHelp"
              >
                <i class="bi bi-x-circle me-2" />
                Tancar
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="closeSustainabilityHelp" />
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="showComplementaryHelp">
      <div class="modal d-block modal-lg" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title mx-auto">
                <i class="bi bi-info-circle-fill me-2" />
                {{ complementaryHelpContent.title }}
              </h5>
            </div>
            <div class="modal-body">
              <p v-if="complementaryHelpParagraphs.length === 0" class="text-muted">
                No hi ha contingut d'ajuda disponible.
              </p>
              <div
                v-for="(paragraph, index) in complementaryHelpParagraphs"
                :key="index"
                class="text-muted mb-3"
                v-html="paragraph"
              />
            </div>
            <div class="modal-footer mx-auto">
              <button
                type="button"
                class="btn btn-info btn-lg help-close-btn"
                @click="closeComplementaryHelp"
              >
                <i class="bi bi-x-circle me-2" />
                Tancar
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="closeComplementaryHelp" />
    </div>
  </Teleport>
</template>

<style scoped>
.view-main {
  min-height: 100vh;
}

.error {
  color: #dc3545;
  font-size: 0.875rem;
  font-weight: 500;
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  opacity: 0.8;
}

.help-icon {
  font-size: 1.1rem;
  line-height: 1;
  padding: 0.25rem 0.5rem 0.25rem 0;
}

.help-close-btn {
  font-size: 1rem;
}

:deep(.help-list) {
  margin: 0.5rem 0 0 0;
}

:deep(.help-quote-label) {
  font-weight: 700;
  margin-bottom: 0.5rem;
}

:deep(.help-quote) {
  margin: 0;
  padding: 0.75rem 1rem;
  border-left: 6px solid #0dcaf0;
  background-color: #f8f9fa;
  color: #495057;
  font-style: italic;
  border-radius: 0.25rem;
}
</style>
