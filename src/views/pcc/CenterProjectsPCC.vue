<script setup>
import { computed, ref } from 'vue'
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

// Components
import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'
import PccCenterProjects from '@/components/PccCenterProjects.vue'

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)

// Computed
const isDone = computed(() => {
  return true
})

const showHelp = ref(false)
const helpContent = {
  title: 'Ajuda - 6. Projectes de Centre',
  body: 'Indica els projectes de centre associats a cada mòdul.\n\n<div class="help-list"><ul><li>Assigna quins projectes de centre es treballen en cada mòdul professional</li><li>Pots afegir múltiples projectes a cada mòdul o eliminar-los individualment</li></ul></div>'
}
const helpParagraphs = computed(() => {
  if (!helpContent.body) return []
  return helpContent.body.split('\n\n').filter(Boolean)
})

const toggleHelp = () => {
  showHelp.value = !showHelp.value
}

const closeHelp = () => {
  showHelp.value = false
}
</script>

<template>
  <main class="border shadow view-main">
    <!-- Breadcrumb -->
    <AppBreadcrumb :actualStep="6" :done="isDone" />

    <!-- Header -->
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <!-- Contenido principal -->
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>
        6. Projectes de Centre
        <span @click="toggleHelp" class="cursor-pointer ms-2 help-icon" role="button" tabindex="0">
          <i class="bi bi-info-circle-fill text-info" />
        </span>
      </h2>
      <p class="text-muted mb-4">
        Contextualitza els projectes de centre al teu cicle. Indica quins projectes es treballen en
        cadasqún dels mòduls.
      </p>

      <PccCenterProjects v-if="pcc.id" :pcc-id="pcc.id" />
    </div>
  </main>

  <Teleport to="body">
    <div v-if="showHelp">
      <div class="modal d-block modal-lg" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title mx-auto">
                <i class="bi bi-info-circle-fill me-2" />
                {{ helpContent.title }}
              </h5>
            </div>
            <div class="modal-body">
              <p v-if="helpParagraphs.length === 0" class="text-muted">
                No hi ha contingut d'ajuda disponible.
              </p>
              <div
                v-for="(paragraph, index) in helpParagraphs"
                :key="index"
                class="text-muted mb-3"
                v-html="paragraph"
              />
            </div>
            <div class="modal-footer mx-auto">
              <button type="button" class="btn btn-info btn-lg help-close-btn" @click="closeHelp">
                <i class="bi bi-x-circle me-2" />
                Tancar
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="closeHelp" />
    </div>
  </Teleport>
</template>

<style scoped>
.view-main {
  min-height: 100vh;
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
</style>
