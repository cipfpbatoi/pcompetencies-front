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

const TURN_LABELS = {
  presential: 'Presencial',
  'half-presential': 'Semi-presencial'
}

const isOptionalModule = (module) => String(module?.code || '').startsWith('CVOP')

const availableTurns = computed(() => {
  const turns = Array.isArray(pcc.value?.cycle?.availableTurns)
    ? pcc.value.cycle.availableTurns
    : []
  return [...new Set(turns)].filter((turn) => TURN_LABELS[turn])
})

const cycleHours = computed(() => Number(pcc.value?.cycle?.hours) || 0)

const getModuleOrganization = (moduleCode) => {
  return pcc.value?.moduleOrganizations?.find((organization) => {
    return organization.module?.code === moduleCode
  })
}

const isOptionalModuleAvailableForTurn = (module, turn) => {
  const optionalTurns = getModuleOrganization(module.code)?.optionalTurns
  return !Array.isArray(optionalTurns) || optionalTurns.length === 0 || optionalTurns.includes(turn)
}

const turnHourSummaries = computed(() => {
  if (!cycleHours.value || availableTurns.value.length < 2) return []

  return availableTurns.value.map((turn) => {
    const regularHours = (pcc.value?.modules || [])
      .filter((module) => !isOptionalModule(module))
      .reduce((total, module) => total + (Number(module.numberOfHours) || 0), 0)

    const optionalHours = [1, 2].reduce((total, courseLevel) => {
      const optionalModule = (pcc.value?.modules || []).find((module) => {
        return (
          isOptionalModule(module) &&
          (module.courseLevel || 1) === courseLevel &&
          isOptionalModuleAvailableForTurn(module, turn)
        )
      })
      return total + (Number(optionalModule?.numberOfHours) || 0)
    }, 0)

    const hours = regularHours + optionalHours
    return {
      turn,
      label: TURN_LABELS[turn],
      hours,
      isComplete: hours === cycleHours.value
    }
  })
})

const hasTurnHoursMismatch = computed(() => turnHourSummaries.value.some((summary) => !summary.isComplete))

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

      <section v-if="turnHourSummaries.length > 0" class="mb-4" aria-label="Hores per torn">
        <div class="card">
          <div class="card-header fw-bold">Hores anuals ofertes per torn</div>
          <ul class="list-group list-group-flush">
            <li
              v-for="summary in turnHourSummaries"
              :key="summary.turn"
              class="list-group-item d-flex justify-content-between align-items-center"
            >
              <span>{{ summary.label }}</span>
              <span :class="summary.isComplete ? 'text-success' : 'text-warning-emphasis'">
                <strong>{{ summary.hours }} / {{ cycleHours }} h</strong>
                <i
                  :class="summary.isComplete ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'"
                  class="ms-2"
                ></i>
              </span>
            </li>
          </ul>
        </div>
        <div v-if="hasTurnHoursMismatch" class="alert alert-warning mt-3 mb-0">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          Cada torn ha d'oferir les {{ cycleHours }} hores anuals del cicle. Revisa les restriccions
          de torn dels mòduls optatius al pas 3.
        </div>
      </section>

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
