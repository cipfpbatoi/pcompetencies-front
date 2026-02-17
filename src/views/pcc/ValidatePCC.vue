<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'

import AppBreadcrumb from '@/components/AppPccBreadcrumb.vue'
import ShowPdfButton from '@/components/ShowPdfButton.vue'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api'

const store = useDataStore()
const { pcc } = storeToRefs(store)
const { addMessage } = store

const isValid = ref(false)
const errors = ref(null)
const isValidating = ref(false)
const isSending = ref(false)

const hasErrors = computed(() => Boolean(errors.value) && !isValid.value)
const isSent = computed(() => pcc.value?.status === 'sent')
const sendButtonLabel = computed(() => (isSent.value ? 'PCC enviat' : 'Enviar PCC al departament'))

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
</script>

<template>
  <main class="border shadow view-main">
    <AppBreadcrumb :actualStep="9" :done="isValid" />
    <div class="mt-2 text-white border-bottom bg-secondary border-2 p-2 text-center border-dark h3">
      {{ pcc.cycle?.completeName }}
    </div>
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>9. Validar i enviar el PCC</h2>

      <div v-if="!isSent && !isValid && !errors">
        <div class="alert alert-info p-2 col-sm-12 col-12 mx-auto text-center">
          <strong>Atenció! </strong>Has de validar el PCC abans d'enviar-lo
        </div>
      </div>

      <div v-if="isSent">
        <div class="alert alert-success p-2 col-sm-12 col-12 mx-auto text-center">
          <strong>Enviat! </strong> El PCC ja s'ha enviat al departament per a la seua aprovació.
        </div>
      </div>

      <div v-if="isValid">
        <div class="alert alert-success p-2 col-sm-12 col-12 mx-auto text-center">
          <strong>Validat! </strong> El PCC està preparat per a ser enviat per a la seva aprovació.
        </div>
      </div>

      <div v-if="isValid" class="text-center m-2 row">
        <div class="alert alert-warning p-2 col-sm-12 col-12 mx-auto">
          <strong>ATENCIÓ:</strong> Un cop enviat el PCC ja no es pot modificar
        </div>
      </div>

      <div class="text-center m-2">
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
