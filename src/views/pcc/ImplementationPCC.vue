<script setup>
import { onMounted, ref, watch } from 'vue'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

const store = useDataStore()
const { pcc } = storeToRefs(store)
const { savePccOtherConsiderations, refreshPccByCycleId } = store

const otherConsiderations = ref('')
const isSaving = ref(false)
const isLoading = ref(true)
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

watch(
  () => pcc.value?.otherConsiderations,
  (value) => {
    otherConsiderations.value = value || ''
  },
  { immediate: true }
)

const save = async () => {
  if (!pcc.value?.id || isSaving.value) return
  isSaving.value = true
  const response = await savePccOtherConsiderations(
    pcc.value.id,
    otherConsiderations.value.trim() || null
  )
  if (response === 'ok') {
    otherConsiderations.value = pcc.value?.otherConsiderations || ''
  }
  isSaving.value = false
}

onMounted(async () => {
  const cycleId = pcc.value?.cycle?.id || localStorage.pccCycleId
  if (!cycleId) {
    isLoading.value = false
    return
  }
  await refreshPccByCycleId(cycleId)
  isLoading.value = false
})
</script>

<template>
  <main class="border shadow view-main">
    <AppBreadcrumb :actualStep="9" :done="true" />

    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <div class="p-lg-4 p-1 p-sm-0">
      <h2>9. Altres Consideracions</h2>

      <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregant...</span>
        </div>
        <p class="mt-3 mb-0 text-muted">Carregant dades del PCC...</p>
      </div>

      <div v-else>
        <div class="alert alert-info mb-3">
          <i class="bi bi-info-circle-fill me-2"></i>
          Aquest apartat et permet afegir observacions finals sobre la implementació del projecte
          curricular. Pots deixar-lo en blanc si no cal afegir res.
        </div>

        <div class="card">
          <div class="card-header pcc fw-bold text-uppercase text-white text-start">
            Altres Consideracions
          </div>
          <div class="card-body">
            <ckeditor
              class="w-100"
              :editor="editor"
              v-model="otherConsiderations"
              :config="editorConfig"
            />
          </div>
          <div class="card-footer text-muted d-flex justify-content-end">
            <button @click="save" class="btn btn-success" :disabled="isSaving || !pcc?.id">
              <i class="bi bi-save me-2"></i>
              {{ isSaving ? 'Guardant...' : 'Guardar consideracions' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.view-main {
  min-height: 100vh;
}

:deep(.ck-editor__editable_inline) {
  min-height: 240px;
}
</style>
