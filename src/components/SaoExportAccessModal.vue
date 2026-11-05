<script setup>
import { computed, ref } from 'vue'
import ModalComponent from './ModalComp.vue'
import { isSaoExportActive, saoProgressLabel } from '../utils/sao.js'

const props = defineProps({
  planName: {
    type: String,
    default: ''
  },
  exportState: {
    type: Object,
    default: null
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

const isStarted = computed(() => isSaoExportActive(props.exportState?.status))
const isOtpRequired = computed(() => props.exportState?.progressStage === 'otp_required')
const progressLabel = computed(() => saoProgressLabel(props.exportState))
const saveButtonText = computed(() => (isOtpRequired.value ? 'Verifica el codi' : 'Inicia la sincronització'))
const saveDisabled = computed(() => {
  if (props.busy) return true
  if (isOtpRequired.value) return !/^\d{6}$/.test(otp.value.trim())
  if (isStarted.value) return true
  return !username.value.trim() || !password.value
})

const submit = () => {
  if (isOtpRequired.value) {
    emit('submit-otp', otp.value.trim())
    otp.value = ''
    return
  }
  if (isStarted.value) return

  emit('submit-credentials', {
    username: username.value.trim(),
    password: password.value
  })
  username.value = ''
  password.value = ''
}

const show = (preserveInput = false) => {
  if (!preserveInput) {
    username.value = ''
    password.value = ''
    otp.value = ''
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
    <p class="mb-3">
      Pla: <strong>{{ planName }}</strong>
    </p>

    <div v-if="error" class="alert alert-danger" role="alert">
      {{ error }}
    </div>

    <template v-if="!isStarted">
      <div class="alert alert-info small">
        Les credencials s’utilitzen únicament durant aquesta sincronització i s’eliminen en acabar.
      </div>
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
        ITACA demana verificació en dos passos. Introdueix el codi temporal mentre el navegador continua obert.
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
