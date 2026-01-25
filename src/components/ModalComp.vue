<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Modal } from 'bootstrap'

// ==========================================
// 📊 PROPS
// ==========================================
const props = defineProps({
  // Identificador único del modal
  modalId: {
    type: String,
    required: true
  },

  // Título del modal
  title: {
    type: String,
    default: ''
  },

  // Tamaño del modal: 'sm', 'md', 'lg', 'xl', 'fullscreen'
  size: {
    type: String,
    default: 'lg',
    validator: (value) => ['sm', 'md', 'lg', 'xl', 'fullscreen'].includes(value)
  },

  // Mostrar botón de guardar
  showSaveButton: {
    type: Boolean,
    default: true
  },

  // Mostrar botón de cerrar
  showCloseButton: {
    type: Boolean,
    default: true
  },

  // Texto del botón guardar
  saveButtonText: {
    type: String,
    default: 'Guarda'
  },

  // Texto del botón cerrar
  closeButtonText: {
    type: String,
    default: 'Tanca'
  },

  // Clase CSS del botón guardar
  saveButtonClass: {
    type: String,
    default: 'btn-success'
  },

  // Clase CSS del botón cerrar
  closeButtonClass: {
    type: String,
    default: 'btn-secondary'
  },

  // Icono del botón guardar (Bootstrap Icons)
  saveButtonIcon: {
    type: String,
    default: ''
  },

  // Icono del botón cerrar
  closeButtonIcon: {
    type: String,
    default: ''
  },

  // Deshabilitar botón guardar (ej: durante carga)
  saveDisabled: {
    type: Boolean,
    default: false
  },

  // Mostrar spinner en botón guardar
  saving: {
    type: Boolean,
    default: false
  },

  // Centrar verticalmente el modal
  centered: {
    type: Boolean,
    default: false
  },

  // Backdrop estático (no cerrar al hacer click fuera)
  staticBackdrop: {
    type: Boolean,
    default: false
  },

  // Permitir cerrar con ESC
  keyboard: {
    type: Boolean,
    default: true
  },

  // Clase adicional para el header
  headerClass: {
    type: String,
    default: 'bg-primary text-white'
  },

  // Clase adicional para el body
  bodyClass: {
    type: String,
    default: ''
  },

  // Clase adicional para el footer
  footerClass: {
    type: String,
    default: ''
  },

  // Hacer el modal scrollable
  scrollable: {
    type: Boolean,
    default: false
  }
})

// ==========================================
// 🎭 EMITS
// ==========================================
const emit = defineEmits([
  'save',      // Al hacer click en guardar
  'close',     // Al cerrar el modal
  'show',      // Cuando el modal se muestra
  'shown',     // Después de que el modal se muestra
  'hide',      // Cuando el modal se oculta
  'hidden'     // Después de que el modal se oculta
])

// ==========================================
// 📊 ESTADO
// ==========================================
const modalInstance = ref(null)
const modalElement = ref(null)

// ==========================================
// 💡 COMPUTED
// ==========================================
const modalDialogClass = computed(() => {
  const classes = ['modal-dialog']

  // Tamaño
  if (props.size !== 'md') {
    if (props.size === 'fullscreen') {
      classes.push('modal-fullscreen')
    } else {
      classes.push(`modal-${props.size}`)
    }
  }

  // Centrado
  if (props.centered) {
    classes.push('modal-dialog-centered')
  }

  // Scrollable
  if (props.scrollable) {
    classes.push('modal-dialog-scrollable')
  }

  return classes.join(' ')
})

const saveButtonClasses = computed(() => {
  return ['btn', props.saveButtonClass, {
    'disabled': props.saveDisabled || props.saving
  }]
})

// ==========================================
// 🔧 MÉTODOS
// ==========================================
const handleSave = async () => {
  if (props.saveDisabled || props.saving) return
  emit('save')
}

const handleClose = () => {
  emit('close')
  hide()
}

// Métodos para control programático
const show = () => {
  modalInstance.value?.show()
}

const hide = () => {
  modalInstance.value?.hide()
}

const toggle = () => {
  modalInstance.value?.toggle()
}

// ==========================================
// 🎬 LIFECYCLE
// ==========================================
onMounted(() => {
  modalElement.value = document.getElementById(props.modalId)

  if (modalElement.value) {
    // Inicializar modal de Bootstrap
    modalInstance.value = new Modal(modalElement.value, {
      backdrop: props.staticBackdrop ? 'static' : true,
      keyboard: props.keyboard
    })

    // Eventos de Bootstrap
    modalElement.value.addEventListener('show.bs.modal', () => {
      emit('show')
    })

    modalElement.value.addEventListener('shown.bs.modal', () => {
      emit('shown')
    })

    modalElement.value.addEventListener('hide.bs.modal', () => {
      emit('hide')
    })

    modalElement.value.addEventListener('hidden.bs.modal', () => {
      emit('hidden')
    })
  }
})

onBeforeUnmount(() => {
  // Limpiar eventos y destruir instancia
  if (modalInstance.value) {
    modalInstance.value.dispose()
  }
})

// ==========================================
// 📤 EXPOSE (Para uso con ref en componente padre)
// ==========================================
defineExpose({
  show,
  hide,
  toggle
})
</script>

<template>
  <div :id="modalId" class="modal fade" tabindex="-1" :aria-labelledby="`${modalId}Label`" aria-hidden="true"
    ref="modalElement">
    <div :class="modalDialogClass">
      <div class="modal-content">

        <!-- HEADER -->
        <div :class="['modal-header', headerClass]">
          <slot name="header">
            <h1 :id="`${modalId}Label`" class="modal-title fs-5">
              {{ title }}
            </h1>
          </slot>
          <button type="button" class="btn-close"
            :class="{ 'btn-close-white': headerClass.includes('dark') || headerClass.includes('primary') }"
            data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <!-- BODY -->
        <div :class="['modal-body', bodyClass]">
          <slot></slot>
        </div>

        <!-- FOOTER -->
        <div v-if="$slots.footer || showCloseButton || showSaveButton" :class="['modal-footer', footerClass]">
          <slot name="footer">
            <!-- Botón Cerrar -->
            <button v-if="showCloseButton" type="button" :class="['btn', closeButtonClass]" data-bs-dismiss="modal"
              @click="handleClose">
              <i v-if="closeButtonIcon" :class="['bi', closeButtonIcon, 'me-1']"></i>
              {{ closeButtonText }}
            </button>

            <!-- Slot para botones adicionales -->
            <slot name="footer-buttons"></slot>

            <!-- Botón Guardar -->
            <button v-if="showSaveButton" type="button" :class="saveButtonClasses" :disabled="saveDisabled || saving"
              @click="handleSave">
              <span v-if="saving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <i v-else-if="saveButtonIcon" :class="['bi', saveButtonIcon, 'me-1']"></i>
              {{ saving ? 'Guardant...' : saveButtonText }}
            </button>
          </slot>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-header {
  border-bottom: 1px solid #dee2e6;
}

.modal-footer {
  border-top: 1px solid #dee2e6;
}

.btn-close-white {
  filter: invert(1) grayscale(100%) brightness(200%);
}
</style>
