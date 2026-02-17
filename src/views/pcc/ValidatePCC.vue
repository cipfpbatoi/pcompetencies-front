<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'

import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'
import ShowPdfButton from '@/components/ShowPdfButton.vue'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api'

const store = useDataStore()
const { pcc, cycle } = storeToRefs(store)
const { addMessage } = store

const isValid = ref(false)
const errors = ref(null)
const isValidating = ref(false)
const isSending = ref(false)

const hasErrors = computed(() => Boolean(errors.value) && !isValid.value)
const isSent = computed(() => ['sent', 'enviat'].includes(pcc.value?.status))
const isRejected = computed(() => ['rejected', 'rebutjat'].includes(pcc.value?.status))
const sendButtonLabel = computed(() => {
  if (isSent.value) return 'PCC enviat'
  if (isRejected.value) return 'Reenviar PCC al departament'
  return 'Enviar PCC al departament'
})

const KEY_LABELS = {
  employabilityCompetences: "Competències per a l'ocupabilitat",
  socioeconomicEnvironment: 'Entorn socioeconòmic',
  opportunities: "Oportunitats d'ocupació",
  methodologicalPrinciples: 'Principis metodològics',
  moduleOrganizationDetails: "Orientacions d'organització de mòduls",
  assessmentTools: "Instruments d'avaluació",
  trainingPlan: 'Pla de formació en empresa',
  companyAssignmentCriteria: "Criteris d'assignació de pràctiques",
  sostenibilityDigital: 'Sostenibilitat i digitalització',
  centerProjects: 'Projectes de centre',
  intermodularProjectGuide: 'Guia del projecte intermodular',
  intermodularOrientations: 'Orientacions del projecte intermodular'
}

const STATUS_LABELS = {
  pending: 'pendent',
  pendent: 'pendent',
  sent: 'enviat',
  enviat: 'enviat',
  approved: 'aprovat',
  aprovat: 'aprovat',
  rejected: 'rebutjat',
  rebutjat: 'rebutjat',
  verified: 'verificat',
  verificat: 'verificat'
}

const resolveKeyLabel = (keyPath) => {
  if (!keyPath) return ''
  const parts = keyPath.split(' > ')
  const mapped = parts.map((part) => KEY_LABELS[part] || part)
  return mapped.join(' > ')
}

const buildLabel = (keyPath, message) => {
  if (!message) return ''
  if (!keyPath) return message
  return `${resolveKeyLabel(keyPath)}: ${message}`
}

const flattenReasons = (reasons, prefix = '') => {
  if (!reasons) return []
  if (typeof reasons === 'string') {
    const label = buildLabel(prefix, reasons)
    return label ? [label] : []
  }
  if (Array.isArray(reasons)) {
    return reasons.flatMap((item) => flattenReasons(item, prefix))
  }
  if (typeof reasons === 'object') {
    return Object.entries(reasons).flatMap(([key, value]) => {
      const nextPrefix = prefix ? `${prefix} > ${key}` : key
      return flattenReasons(value, nextPrefix)
    })
  }
  const fallback = buildLabel(prefix, String(reasons))
  return fallback ? [fallback] : []
}

const formattedErrors = computed(() => flattenReasons(errors.value))
const statusLabel = computed(() => STATUS_LABELS[pcc.value?.status] || pcc.value?.status || '-')
const rejectionReason = computed(() => {
  return (
    pcc.value?.rejectedMessage?.reason ||
    pcc.value?.rejectedMessage?.message ||
    pcc.value?.rejectionReason ||
    pcc.value?.rejectReason ||
    pcc.value?.reason ||
    ''
  )
})

const refreshPcc = async () => {
  const storedData = localStorage.data ? JSON.parse(localStorage.data) : null
  const cycleId =
    pcc.value?.cycle?.id || cycle.value?.id || localStorage.pccCycleId || storedData?.cycleId
  if (!cycleId) return
  try {
    const response = await api.getPCCByCycleId(cycleId)
    pcc.value = response.data
  } catch (error) {
    if (error.response?.status !== 404) {
      addMessage('error', error)
    }
  }
}

const validatePcc = async () => {
  if (!pcc.value?.id) return
  isValidating.value = true
  try {
    const response = await api.pccValidate(pcc.value.id)
    isValid.value = !response.data?.error
    errors.value = response.data?.reasons || null
    if (isValid.value) {
      errors.value = null
    }
  } catch (error) {
    addMessage('error', error)
  } finally {
    isValidating.value = false
  }
}

const sendPcc = async () => {
  if (!pcc.value?.id) return
  const confirmed = confirm('Una vegada enviat el PCC ja no es pot modificar. Vols continuar?')
  if (!confirmed) return

  isSending.value = true
  try {
    await api.pccSend(pcc.value.id)
    pcc.value.status = 'sent'
    addMessage('success', 'PCC enviat correctament')
  } catch (error) {
    addMessage('error', error)
  } finally {
    isSending.value = false
  }
}

onMounted(() => {
  refreshPcc()
})
</script>

<template>
  <main class="border shadow view-main">
    <AppBreadcrumb :actualStep="9" :done="isValid" />
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>9. Validar i enviar el PCC</h2>

      <div v-if="isRejected">
        <div class="alert alert-danger p-2 col-sm-12 col-12 mx-auto text-center">
          El Projecte curricular ha sigut {{ statusLabel }}
          <div v-if="rejectionReason" class="mt-2">Motiu: {{ rejectionReason }}</div>
        </div>
      </div>

      <div v-else-if="!isSent && !isValid && !errors">
        <div class="alert alert-info p-2 col-sm-12 col-12 mx-auto text-center">
          El Projecte curricular ha sigut {{ statusLabel }}
        </div>
      </div>

      <div v-if="isSent">
        <div class="alert alert-success p-2 col-sm-12 col-12 mx-auto text-center">
          <strong>Enviat! </strong> El PCC ja s'ha enviat al departament per a la seua aprovació.
        </div>
      </div>

      <div v-if="isValid && !isSent">
        <div class="alert alert-success p-2 col-sm-12 col-12 mx-auto text-center">
          <strong>Validat! </strong> El PCC està preparat per a ser enviat per a la seva aprovació.
        </div>
      </div>

      <div v-if="isValid && !isSent" class="text-center m-2 row">
        <div class="alert alert-warning p-2 col-sm-12 col-12 mx-auto">
          <strong>ATENCIÓ:</strong> Un cop enviat el PCC ja no es pot modificar
        </div>
      </div>

      <div v-if="!isSent && !['approved', 'aprovat'].includes(pcc?.status)" class="text-center m-2">
        <button
          @click="validatePcc"
          class="btn btn-info col-sm-5 col-12"
          title="Validar"
          :disabled="isValid || isValidating || isSent"
        >
          <i class="bi bi-check-circle px-2"></i>
          Validar PCC
        </button>
      </div>

      <div v-if="hasErrors" class="alert alert-danger">
        <h4 class="text-center">
          Atenció! El PCC té errors i has de corregir-los abans d'enviar-lo
        </h4>
        <ul>
          <li v-for="(error, index) in formattedErrors" :key="index">{{ error }}</li>
        </ul>
      </div>

      <div v-if="isValid" class="text-center m-2 row">
        <button
          @click="sendPcc"
          class="btn btn-success col-sm-5 col-12 mx-auto"
          title="Enviar PCC"
          :disabled="isSending || isSent"
        >
          <i class="bi bi-send mx-2"></i>
          {{ sendButtonLabel }}
        </button>
      </div>

      <div class="text-center m-2">
        <ShowPdfButton
          type="pcc"
          :pcc="pcc"
          title="Veure esborrany del PCC"
          buttonClass="btn btn-danger col-sm-5 col-12"
        />
      </div>
    </div>
  </main>
</template>

<style scoped></style>
