<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/stores/data'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

// Props
const props = defineProps({
  pccId: {
    type: Number,
    required: true
  }
})

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)
const { savePCCTrainingPlan, deletePCCTrainingPlan } = store

// CKEditor
const editor = ClassicEditor
const editorConfig = {
  toolbar: ['heading', '|', 'bold', 'italic', 'bulletedList', 'numberedList', '|', 'undo', 'redo']
}

// Estado local
const isLoading = ref(false)
const isEditing = ref(false)
const showDeleteModal = ref(false)

// Formulario
const form = ref({
  firstCourseHours: 0,
  secondCourseHours: 0,
  companyAssignmentCriterias: ''
})

const formErrors = ref({})

// Computeds
const trainingPlan = computed(() => pcc.value?.trainingPlan || null)
const hasTrainingPlan = computed(() => !!trainingPlan.value)
const minTotalFEHours = computed(
  () => pcc.value?.minTotalFeHours || pcc.value?.minTotalFEHours || 0
)

const cycleTotalHours = computed(() => {
  const cycle = pcc.value?.cycle
  if (!cycle) return 0
  if (cycle.hours) return cycle.hours
  if (cycle.totalHours) return cycle.totalHours
  if (cycle.modules?.length) {
    return cycle.modules.reduce((total, module) => total + (module.numberOfHours || 0), 0)
  }
  return 0
})

const maxTotalFEHours = computed(() => {
  return 700
})

const totalHours = computed(() => {
  return (
    (parseInt(form.value.firstCourseHours, 10) || 0) +
    (parseInt(form.value.secondCourseHours, 10) || 0)
  )
})

const isHoursMinValid = computed(() => {
  if (!minTotalFEHours.value) return true
  return totalHours.value >= minTotalFEHours.value
})

const isHoursMaxValid = computed(() => {
  if (!maxTotalFEHours.value) return true
  return totalHours.value <= maxTotalFEHours.value
})

const isHoursValid = computed(() => {
  return isHoursMinValid.value && isHoursMaxValid.value
})

// Criterios de centro (se mostrarán como información, no editables)
const centerCriterias = computed(() => pcc.value?.center?.companyAssignmentCriterias || null)

// Métodos
const startEditing = () => {
  if (hasTrainingPlan.value) {
    form.value = {
      firstCourseHours: trainingPlan.value.firstCourseHours || 0,
      secondCourseHours: trainingPlan.value.secondCourseHours || 0,
      companyAssignmentCriterias: trainingPlan.value.companyAssignmentCriterias || ''
    }
  } else {
    form.value = {
      firstCourseHours: 0,
      secondCourseHours: 0,
      companyAssignmentCriterias: ''
    }
  }
  formErrors.value = {}
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
  formErrors.value = {}
}

const validateForm = () => {
  const errors = {}

  if (
    form.value.firstCourseHours === null ||
    form.value.firstCourseHours === '' ||
    form.value.firstCourseHours < 0
  ) {
    errors.firstCourseHours = 'Les hores de 1r curs són obligatòries i han de ser >= 0'
  }

  if (
    form.value.secondCourseHours === null ||
    form.value.secondCourseHours === '' ||
    form.value.secondCourseHours < 0
  ) {
    errors.secondCourseHours = 'Les hores de 2n curs són obligatòries i han de ser >= 0'
  }

  if (
    !form.value.companyAssignmentCriterias ||
    form.value.companyAssignmentCriterias.trim().length === 0
  ) {
    errors.companyAssignmentCriterias = "Els criteris d'assignació són obligatoris"
  }

  if (minTotalFEHours.value && totalHours.value < minTotalFEHours.value) {
    errors.totalHours = `Com a mínim ${minTotalFEHours.value} hores`
  }

  if (maxTotalFEHours.value && totalHours.value > maxTotalFEHours.value) {
    errors.totalHours = `Ha de ser <= ${maxTotalFEHours.value} hores`
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveTrainingPlan = async () => {
  if (!validateForm()) {
    store.addMessage('error', 'Corregeix els errors abans de guardar')
    return
  }

  isLoading.value = true
  try {
    const data = {
      firstCourseHours: parseInt(form.value.firstCourseHours, 10),
      secondCourseHours: parseInt(form.value.secondCourseHours, 10),
      companyAssignmentCriterias: form.value.companyAssignmentCriterias.trim()
    }

    const success = await savePCCTrainingPlan(props.pccId, data)
    if (success) {
      isEditing.value = false
      store.addMessage('success', 'Pla formatiu guardat correctament')
    }
  } finally {
    isLoading.value = false
  }
}

const openDeleteModal = () => {
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
}

const confirmDelete = async () => {
  isLoading.value = true
  try {
    const success = await deletePCCTrainingPlan(props.pccId)
    if (success) {
      closeDeleteModal()
      isEditing.value = false
      store.addMessage('success', 'Pla formatiu eliminat correctament')
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="pcc-training-plan">
    <!-- Vista de lectura -->
    <div v-if="!isEditing">
      <div v-if="hasTrainingPlan" class="card">
        <div
          class="card-header bg-info text-white fw-bold d-flex justify-content-between align-items-center"
        >
          <span>
            <i class="bi bi-building me-2"></i>
            Pla Formatiu d'Empresa
          </span>
          <div>
            <button class="btn btn-sm btn-light me-1" @click="startEditing" :disabled="isLoading">
              <i class="bi bi-pencil me-1"></i>
              Modificar
            </button>
            <button class="btn btn-sm btn-danger" @click="openDeleteModal" :disabled="isLoading">
              <i class="bi bi-trash me-1"></i>
              Eliminar
            </button>
          </div>
        </div>
        <div class="card-body">
          <!-- Horas -->
          <div class="row mb-3">
            <div class="col-12 col-md-6">
              <div class="card bg-light">
                <div class="card-body text-center">
                  <h6 class="card-subtitle text-muted">Hores 1r Curs</h6>
                  <p class="h3 mb-0 mt-2">{{ trainingPlan.firstCourseHours }}</p>
                </div>
              </div>
            </div>
            <div class="col-12 col-md-6 mt-2 mt-md-0">
              <div class="card bg-light">
                <div class="card-body text-center">
                  <h6 class="card-subtitle text-muted">Hores 2n Curs</h6>
                  <p class="h3 mb-0 mt-2">{{ trainingPlan.secondCourseHours }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Criterios de centro (solo lectura) -->
          <div v-if="centerCriterias" class="mb-3">
            <h6 class="fw-bold text-secondary">
              <i class="bi bi-bank me-1"></i>
              Criteris de centre (definits pel PEC)
            </h6>
            <div class="border rounded p-3 bg-light" v-html="centerCriterias"></div>
          </div>

          <!-- Criterios del PCC -->
          <div>
            <h6 class="fw-bold text-secondary">
              <i class="bi bi-people me-1"></i>
              Criteris d'assignació de l'alumnat a les Empreses
            </h6>
            <div class="text-muted mb-2">
              1. Alumnat que busca empresa per compte propi<br />
              2. Requisits específics per part del centre de treball<br />
              <span class="line-3-emphasis">
                3. Els criteris d'assignació per a la resta de alumnat són:
              </span>
            </div>
            <div class="border rounded p-3" v-html="trainingPlan.companyAssignmentCriterias"></div>
          </div>
        </div>
      </div>

      <!-- Sin plan formativo -->
      <div v-else class="card">
        <div class="card-body text-center py-5">
          <i class="bi bi-building display-4 text-muted"></i>
          <h5 class="mt-3 text-muted">No s'ha definit cap Pla Formatiu d'Empresa</h5>
          <p class="text-muted">Fes clic per crear-ne un.</p>
          <button class="btn btn-primary" @click="startEditing">
            <i class="bi bi-plus-circle me-1"></i>
            Crear Pla Formatiu
          </button>
        </div>
      </div>
    </div>

    <!-- Vista de edición -->
    <div v-else class="card">
      <div class="card-header bg-primary text-white fw-bold">
        <i class="bi bi-building me-2"></i>
        {{ hasTrainingPlan ? 'Modificar' : 'Crear' }} Pla Formatiu d'Empresa
      </div>
      <div class="card-body">
        <!-- Horas -->
        <div class="row mb-3">
          <div class="col-12 col-md-6">
            <label class="form-label fw-bold">
              Hores 1r Curs <span class="text-danger">*</span>
            </label>
            <div class="form-text">Recomanació: 150 hores en 1r curs</div>
            <input
              type="number"
              class="form-control"
              v-model.number="form.firstCourseHours"
              min="0"
              :class="{ 'is-invalid': formErrors.firstCourseHours }"
            />
            <div v-if="formErrors.firstCourseHours" class="invalid-feedback">
              {{ formErrors.firstCourseHours }}
            </div>
          </div>
          <div class="col-12 col-md-6 mt-2 mt-md-0">
            <label class="form-label fw-bold">
              Hores 2n Curs <span class="text-danger">*</span>
            </label>
            <div class="form-text invisible">Recomanació: 150 hores en 1r curs</div>
            <input
              type="number"
              class="form-control"
              v-model.number="form.secondCourseHours"
              min="0"
              :class="{ 'is-invalid': formErrors.secondCourseHours }"
            />
            <div v-if="formErrors.secondCourseHours" class="invalid-feedback">
              {{ formErrors.secondCourseHours }}
            </div>
          </div>
        </div>

        <!-- Validación suma de horas -->
        <div class="alert" :class="isHoursValid ? 'alert-success' : 'alert-warning'">
          <strong>Total hores FE: {{ totalHours }}</strong>
          <span v-if="minTotalFEHours">
            <span v-if="isHoursMinValid">
              <i class="bi bi-check-circle-fill ms-2"></i>
              (mínim: {{ minTotalFEHours }})
            </span>
            <span v-else>
              <i class="bi bi-exclamation-triangle-fill ms-2"></i>
              Com a mínim {{ minTotalFEHours }} hores
            </span>
          </span>
        </div>
        <div v-if="formErrors.totalHours" class="alert alert-danger">
          {{ formErrors.totalHours }}
        </div>

        <!-- Criterios de centro (solo lectura) -->
        <div v-if="centerCriterias" class="mb-3">
          <h6 class="fw-bold text-secondary">
            <i class="bi bi-bank me-1"></i>
            Criteris de centre (definits pel PEC - no editables)
          </h6>
          <div class="border rounded p-3 bg-light" v-html="centerCriterias"></div>
        </div>

        <!-- Criterios del PCC (editables) -->
        <div class="mb-3">
          <label class="form-label fw-bold">
            <i class="bi bi-people me-1"></i>
            Criteris d'assignació de l'alumnat a les Empreses<br />
            1. Alumnat que busca empresa per compte propi<br />
            2. Requisits específics per part del centre de treball<br />
            <span class="line-3-emphasis">
              3. Especifica ací els criteris d'assignació per a la resta de l'alumnat a l'empresa
            </span>
            <br />
            <span class="text-danger">*</span>
          </label>
          <ckeditor
            :editor="editor"
            v-model="form.companyAssignmentCriterias"
            :config="editorConfig"
          />
          <div v-if="formErrors.companyAssignmentCriterias" class="text-danger small mt-2">
            {{ formErrors.companyAssignmentCriterias }}
          </div>
        </div>
      </div>
      <div class="card-footer d-flex justify-content-end gap-2">
        <button class="btn btn-secondary" @click="cancelEditing" :disabled="isLoading">
          <i class="bi bi-x-circle me-1"></i>
          Cancel·lar
        </button>
        <button class="btn btn-primary" @click="saveTrainingPlan" :disabled="isLoading">
          <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-check-circle me-1"></i>
          Guardar
        </button>
      </div>
    </div>

    <!-- Modal de confirmación de eliminación -->
    <Teleport to="body">
      <div v-if="showDeleteModal">
        <div class="modal d-block" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-danger text-white">
                <h5 class="modal-title">
                  <i class="bi bi-exclamation-triangle me-2"></i>
                  Confirmar eliminació
                </h5>
                <button
                  type="button"
                  class="btn-close btn-close-white"
                  @click="closeDeleteModal"
                ></button>
              </div>
              <div class="modal-body">
                <p>Estàs segur que vols eliminar el Pla Formatiu d'Empresa?</p>
                <p class="text-muted small mb-0">
                  Aquesta acció eliminarà tota la configuració d'hores i criteris d'assignació.
                </p>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" @click="closeDeleteModal" :disabled="isLoading">
                  Cancel·lar
                </button>
                <button class="btn btn-danger" @click="confirmDelete" :disabled="isLoading">
                  <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-trash me-1"></i>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show" @click="closeDeleteModal"></div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.line-3-emphasis {
  font-size: 1.1rem;
}
</style>
