<script setup>
import { computed, ref } from 'vue'
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

// Components
import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'
import PccModuleOrganization from '@/components/PccModuleOrganization.vue'

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)
const showHelp = ref(false)
const openHelp = () => {
  showHelp.value = true
}
const closeHelp = () => {
  showHelp.value = false
}

// Computed
const isDone = computed(() => {
  if (!pcc.value?.modules || !pcc.value?.moduleOrganizations) return false

  // Verificar que todos los módulos tengan organización definida
  return pcc.value.modules.every((module) => {
    return pcc.value.moduleOrganizations.some((mo) => mo.module?.code === module.code)
  })
})
</script>

<template>
  <main class="border shadow view-main">
    <!-- Breadcrumb -->
    <AppBreadcrumb :actualStep="3" :done="isDone" />

    <!-- Header -->
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>

    <!-- Contenido principal -->
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>
        3. Organització i Distribució dels Mòduls Professionals
        <span @click="openHelp" class="cursor-pointer ms-2 help-icon" role="button" tabindex="0">
          <i class="bi bi-info-circle-fill text-info" />
        </span>
      </h2>

      <div v-if="!isDone" class="alert alert-warning mb-4">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        <strong>Important:</strong> Has de definir l'organització per a tots els mòduls abans de
        continuar al següent pas.
      </div>

      <!-- Componente de organización de módulos -->
      <PccModuleOrganization v-if="pcc.id" :pcc-id="pcc.id" />
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
                Ajuda - 3. Organització i Distribució dels Mòduls Professionals
              </h5>
            </div>
            <div class="modal-body">
              <strong
                >Defineix l'organització i distribució de cada mòdul professional del cicle.</strong
              >
              <p class="mb-0 mt-2">Per a cada mòdul has de definir:</p>
              <ul class="mb-0 mt-2">
                <li><strong>Distribució:</strong> Com es reparteixen les hores (ex: 2+9)</li>
                <li>
                  <strong>Hores d'aula i laboratori:</strong> Distribució de les hores setmanals
                </li>
                <li><strong>Idioma:</strong> Idioma en què s'imparteix el mòdul</li>
                <li>
                  <strong>Altres consideracions:</strong> Informació addicional sobre l'organització
                  i distribució del mòdul (si és necessària)
                </li>
                <li>
                  <strong>Dualitzable:</strong> Indica si el mòdul es vol dualitzar al nostre centre
                </li>
              </ul>
            </div>
            <div class="modal-footer mx-auto">
              <button type="button" class="btn btn-info btn-lg" @click="closeHelp">
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
</style>
