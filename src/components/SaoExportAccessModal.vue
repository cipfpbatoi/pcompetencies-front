<script setup>
import { computed, ref, watch } from 'vue'
import ModalComponent from './ModalComp.vue'
import { isSaoExportActive, saoProgressLabel, saoStatusLabel } from '../utils/sao.js'

const props = defineProps({
  batchPlans: {
    type: Array,
    default: () => []
  },
  planName: {
    type: String,
    default: ''
  },
  moduleLabel: {
    type: String,
    default: ''
  },
  exportState: {
    type: Object,
    default: null
  },
  allowForce: {
    type: Boolean,
    default: false
  },
  busy: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['submit-credentials', 'submit-otp'])
const modalRef = ref(null)
const username = ref('')
const password = ref('')
const otp = ref('')
const force = ref(false)

const isStarted = computed(() => isSaoExportActive(props.exportState?.status))
const isOtpRequired = computed(
  () => isStarted.value && props.exportState?.progressStage === 'otp_required'
)
watch(isOtpRequired, (required) => {
  if (!required) otp.value = ''
})
const progressLabel = computed(() => saoProgressLabel(props.exportState))
const saveButtonText = computed(() =>
  isOtpRequired.value ? 'Verifica el codi' : 'Inicia la sincronització'
)
const saveDisabled = computed(() => {
  if (props.busy) return true
  if (isOtpRequired.value) return !/^\d{6}$/.test(otp.value.trim())
  if (isStarted.value) return true
  return !username.value.trim() || !password.value
})

const submit = () => {
  if (saveDisabled.value) return
  if (isOtpRequired.value) {
    emit('submit-otp', otp.value.trim())
    otp.value = ''
    return
  }
  if (isStarted.value) return

  emit('submit-credentials', {
    username: username.value.trim(),
    password: password.value,
    force: props.allowForce && force.value
  })
  username.value = ''
  password.value = ''
  force.value = false
}

const show = (preserveInput = false) => {
  if (!preserveInput) {
    username.value = ''
    password.value = ''
    otp.value = ''
    force.value = false
  }
  modalRef.value?.show()
}

const hide = () => modalRef.value?.hide()

defineExpose({ show, hide })
</script>

<template>
  <ModalComponent
    ref="modalRef"
    modal-id="saoExportAccessModal"
    title="Sincronització amb SAÓ"
    size="md"
    centered
    static-backdrop
    :save-button-text="saveButtonText"
    save-button-icon="bi-shield-lock-fill"
    :save-disabled="saveDisabled"
    :saving="busy"
    close-button-text="Tanca"
    @save="submit"
  >
    <div v-if="batchPlans.length" class="mb-3">
      <strong>Lot de {{ batchPlans.length }} plans (màxim 4)</strong>
      <ul class="mb-0 mt-2">
        <li v-for="plan in batchPlans" :key="plan.id">
          {{ plan.name }}<span v-if="plan.status"> — {{ saoStatusLabel(plan.status) }}</span>
        </li>
      </ul>
      <p class="small text-secondary mt-2 mb-0">
        Els plans se sincronitzen consecutivament amb una única sessió d’ITACA/SAÓ.
      </p>
    </div>
    <p v-else class="mb-3">
      Pla: <strong>{{ planName }}</strong>
    </p>
    <p v-if="moduleLabel" class="mb-3">
      Mòdul: <strong>{{ moduleLabel }}</strong
      >. Es reexportarà únicament este mòdul.
    </p>

    <div v-if="error" class="alert alert-danger" role="alert">
      {{ error }}
    </div>

    <template v-if="!isStarted">
      <div class="alert alert-info small">
        Les credencials s’utilitzen únicament durant aquesta sincronització i s’eliminen en acabar.
      </div>
      <div class="alert alert-warning small" role="alert">
        <strong>Advertència:</strong> perquè la sincronització funcione, has de tindre el rol de
        coordinador/a en ITACA. Si no el tens, contacta amb el Departament de FCT o amb la caporalia
        perquè sincronitzen la plantilla.
      </div>
      <fieldset v-if="allowForce" class="mb-3">
        <legend class="form-label fw-bold mb-2">Tipus de reexportació</legend>
        <div class="form-check">
          <input
            id="saoNormalExport"
            v-model="force"
            class="form-check-input"
            type="radio"
            :value="false"
            :disabled="busy"
          />
          <label class="form-check-label" for="saoNormalExport">
            Normal: sincronitza només si la plantilla és nova, el pla ha canviat o hi ha mòduls amb
            errors o avisos (Recomanat)
          </label>
        </div>
        <div class="form-check">
          <input
            id="saoForcedExport"
            v-model="force"
            class="form-check-input"
            type="radio"
            :value="true"
            :disabled="busy"
          />
          <label class="form-check-label" for="saoForcedExport">
            Forçada: revisa tots els mòduls i recrea les plantilles eliminades en SAÓ
          </label>
        </div>
      </fieldset>
      <div class="mb-3">
        <label for="saoUsername" class="form-label fw-bold">Usuari d’ITACA/SAÓ</label>
        <input
          id="saoUsername"
          v-model="username"
          class="form-control"
          type="text"
          autocomplete="username"
          :disabled="busy"
          @keyup.enter="submit"
        />
      </div>
      <div class="mb-2">
        <label for="saoPassword" class="form-label fw-bold">Contrasenya</label>
        <input
          id="saoPassword"
          v-model="password"
          class="form-control"
          type="password"
          autocomplete="current-password"
          :disabled="busy"
          @keyup.enter="submit"
        />
      </div>
    </template>

    <template v-else-if="isOtpRequired">
      <div class="alert alert-warning">
        ITACA demana verificació en dos passos. Introdueix el codi temporal mentre el navegador
        continua obert.
      </div>
      <label for="saoOtp" class="form-label fw-bold">Codi temporal de sis dígits</label>
      <input
        id="saoOtp"
        v-model="otp"
        class="form-control form-control-lg text-center sao-otp-input"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="6"
        pattern="[0-9]{6}"
        :disabled="busy"
        @keyup.enter="submit"
      />
    </template>

    <template v-else>
      <div class="d-flex align-items-center gap-3 py-3">
        <span class="spinner-border text-primary" role="status" aria-hidden="true"></span>
        <div>
          <div class="fw-bold">Sincronització en curs</div>
          <div class="text-secondary">{{ progressLabel }}</div>
        </div>
      </div>
    </template>
  </ModalComponent>
</template>

<style scoped>
.sao-otp-input {
  max-width: 12rem;
  letter-spacing: 0.4rem;
}
</style>
