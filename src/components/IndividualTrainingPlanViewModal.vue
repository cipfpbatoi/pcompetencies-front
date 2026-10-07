<script setup>
import { computed, ref } from 'vue'
import { api } from '../repositories/api.js'
import ModalComponent from './ModalComp.vue'

// Modal de sols lectura per a veure un pla formatiu individual sense navegar
// a la pàgina de gestió del PCC (usat des de la pantalla de revisió de plans,
// que pot mostrar plans de qualsevol departament)

const TURN_LABELS = {
  presential: 'Presencial',
  'half-presential': 'Semi-presencial'
}

const modalRef = ref(null)
const plan = ref(null)
const modules = ref([])
const isLoading = ref(false)

const getTurnLabel = (turn) => TURN_LABELS[turn] || turn

// El backend pot tornar un datetime complet (p. ex. "2026-01-15T00:00:00+00:00"):
// ací sols es mostra la data
const formatDate = (value) => (value ? String(value).slice(0, 10) : '')

const modalTitle = computed(() =>
  plan.value
    ? `Veure pla formatiu individual — ${plan.value.name}`
    : 'Veure pla formatiu individual'
)

const moduleHoursEntries = computed(() =>
  (plan.value?.moduleHours || []).filter((entry) => entry.module?.code)
)

const totalHours = computed(
  () =>
    plan.value?.totalHours ??
    moduleHoursEntries.value.reduce((sum, entry) => sum + (entry.hours || 0), 0)
)

const periods = computed(() => plan.value?.periods || [])

const totalPeriodsHours = computed(() =>
  periods.value.reduce((sum, period) => sum + (period.hours || 0), 0)
)

const periodsHoursMismatch = computed(
  () => periods.value.length > 0 && totalPeriodsHours.value !== totalHours.value
)

const suggestedHoursByModuleCode = computed(() => {
  const map = new Map()
  modules.value.forEach((mod) => map.set(mod.moduleCode, mod.suggestedHours ?? 0))
  return map
})

// Sols els mòduls/RA/CE marcats com a seleccionats per l'API (available-items amb planId),
// i de cada RA sols els seus criteris seleccionats (tret que el RA s'haja marcat sencer)
const summaryModules = computed(() =>
  modules.value
    .map((mod) => ({
      ...mod,
      learningResults: mod.learningResults
        .filter((lr) => lr.selected || lr.evaluationCriterias.some((ce) => ce.selected))
        .map((lr) => ({
          ...lr,
          evaluationCriterias: lr.selected
            ? lr.evaluationCriterias
            : lr.evaluationCriterias.filter((ce) => ce.selected)
        }))
    }))
    .filter((mod) => mod.learningResults.length > 0)
)

const show = async (targetPlan) => {
  plan.value = targetPlan
  modules.value = []
  modalRef.value?.show()

  const pccId = targetPlan.curricularProject?.id
  if (!pccId) return

  isLoading.value = true
  try {
    // El pla rebut des del llistat de gestió no porta moduleHours (sols noms de
    // mòdul i el total): es recarrega complet per tindre hores i activitats
    const planResponse = await api.getIndividualTrainingPlan(pccId, targetPlan.id)
    plan.value = planResponse.data

    const itemsResponse = await api.getIndividualTrainingPlanAvailableItems(
      pccId,
      plan.value.turn,
      targetPlan.id
    )
    modules.value = itemsResponse.data
  } catch {
    modules.value = []
  } finally {
    isLoading.value = false
  }
}

defineExpose({ show })
</script>

<template>
  <ModalComponent
    ref="modalRef"
    modal-id="individualTrainingPlanViewModal"
    :title="modalTitle"
    size="xl"
    scrollable
    :show-save-button="false"
    close-button-text="Tanca"
  >
    <template v-if="plan">
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <label class="form-label fw-bold">Nom del pla</label>
          <p class="mb-0">{{ plan.name }}</p>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label fw-bold">Torn</label>
          <p class="mb-0">{{ getTurnLabel(plan.turn) }}</p>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label fw-bold">Curs</label>
          <p class="mb-0">{{ plan.courseLevel === 2 ? '2n Curs' : '1r Curs' }}</p>
        </div>
        <div v-if="plan.requiresExtraordinaryAuthorizations" class="col-12">
          <label class="form-label fw-bold">Autoritzacions necessàries</label>
          <p class="mb-0">{{ plan.extraordinaryAuthorizations }}</p>
        </div>
        <div v-if="plan.observations" class="col-12">
          <label class="form-label fw-bold">Observacions</label>
          <p class="mb-0">{{ plan.observations }}</p>
        </div>
      </div>

      <hr />

      <div v-if="isLoading" class="text-center py-4">
        <span class="spinner-border text-primary"></span>
      </div>
      <template v-else>
        <h6 class="fw-bold">RA i criteris seleccionats</h6>
        <p v-if="summaryModules.length === 0" class="alert alert-secondary mb-0">
          Este pla no té cap RA ni criteri seleccionat.
        </p>
        <div v-for="mod in summaryModules" :key="mod.moduleCode" class="card mb-3">
          <div class="card-header bg-light fw-bold">
            {{ mod.moduleName }} ({{ mod.moduleCode }})
          </div>
          <ul class="list-group list-group-flush">
            <li v-for="lr in mod.learningResults" :key="lr.id" class="list-group-item">
              <div class="row g-2 align-items-start">
                <div class="col">
                  <div class="fw-bold mb-1">
                    <strong>RA{{ lr.number }}</strong> - {{ lr.descriptor }}
                    <span v-if="lr.selected" class="badge bg-primary ms-1">Tot el RA</span>
                  </div>
                  <ul v-if="lr.evaluationCriterias.length" class="mb-0 ps-4">
                    <li v-for="ce in lr.evaluationCriterias" :key="ce.id">
                      <strong>{{ ce.code }}</strong> - {{ ce.description }}
                    </li>
                  </ul>
                </div>
                <div class="col-auto">
                  <span
                    class="badge"
                    :class="lr.coverage === 'complete' ? 'bg-success' : 'bg-secondary'"
                    :title="
                      lr.coverage === 'complete'
                        ? 'Este RA només es treballa en la situació en empresa: es cobreix sencer'
                        : `Este RA també es treballa en altres situacions d'aprenentatge: sols es cobreix en part`
                    "
                  >
                    <i class="bi bi-check-lg"></i>
                    {{ lr.coverage === 'complete' ? 'Solo empresa' : 'Empresa + Centro' }}
                  </span>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div class="card mb-3">
          <div class="card-header bg-light fw-bold">
            <i class="bi bi-clipboard-check me-1"></i> Hores per mòduls i altres especificacions
          </div>
          <div class="card-body">
            <p v-if="moduleHoursEntries.length === 0" class="text-muted small mb-0">
              Este pla no té hores assignades.
            </p>
            <div
              v-for="entry in moduleHoursEntries"
              :key="entry.module.code"
              class="mb-2 rounded px-3 py-2 bg-light"
            >
              <div class="d-flex justify-content-between align-items-center gap-2">
                <span class="fw-bold">
                  {{ entry.module.name }} (Hores SA Dualitzables PD:
                  {{ suggestedHoursByModuleCode.get(entry.module.code) || 0 }}h)
                </span>
                <span class="badge bg-secondary">{{ entry.hours }}h</span>
              </div>
              <p v-if="entry.activities" class="mb-0 mt-2 small">{{ entry.activities }}</p>
            </div>

            <div
              v-if="moduleHoursEntries.length > 0"
              class="d-flex justify-content-between align-items-center fw-bold border-top pt-2 mt-1 fs-5 text-primary"
            >
              <span>Total hores</span>
              <span>{{ totalHours }}h</span>
            </div>
          </div>
        </div>

        <div v-if="plan.coordinationMechanisms" class="card mb-3">
          <div class="card-header bg-light fw-bold">
            Mecanismes de coordinació i seguiment durant el període de formació en empresa
          </div>
          <div class="card-body">
            <p class="mb-0">{{ plan.coordinationMechanisms }}</p>
          </div>
        </div>

        <div v-if="plan.visitPeriodicity" class="card mb-3">
          <div class="card-header bg-light fw-bold">
            Periodicitat de les visites: Visites a les empreses, comunicació telefònica: dates i
            duració, comunicació per correu electrònic, videotelefonades: dates i duració.
          </div>
          <div class="card-body">
            <p class="mb-0">{{ plan.visitPeriodicity }}</p>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header bg-light fw-bold">
            <i class="bi bi-calendar-range me-1"></i> Períodes de formació en empresa
          </div>
          <div class="card-body">
            <p v-if="periods.length === 0" class="text-muted small mb-0">
              Este pla no té cap període assignat.
            </p>
            <div v-else class="table-responsive">
              <table class="table table-sm table-bordered align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Data inici</th>
                    <th>Data fi</th>
                    <th>Empresa</th>
                    <th class="text-center">Hores</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(period, index) in periods" :key="index">
                    <td>{{ formatDate(period.startDate) }}</td>
                    <td>{{ formatDate(period.endDate) }}</td>
                    <td>{{ period.company }}</td>
                    <td class="text-center">{{ period.hours }}h</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="periodsHoursMismatch" class="alert alert-warning py-2 px-3 mb-0 mt-2">
              <i class="bi bi-exclamation-triangle-fill"></i>
              La suma de les hores dels períodes ({{ totalPeriodsHours }}h) no coincideix amb el
              total d'hores del pla ({{ totalHours }}h).
            </div>
          </div>
        </div>
      </template>
    </template>
  </ModalComponent>
</template>
