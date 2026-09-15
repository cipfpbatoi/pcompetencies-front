// composables/useModal.js
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Modal } from 'bootstrap'

export function useModal(modalId = null, options = {}) {
  const {
    onShow = null,
    onHide = null,
    onConfirm = null,
    bootstrapOptions = {}
  } = options

  const modalInstance = ref(null)
  const isVisible = ref(false)
  const isInitialized = ref(false)

  const canShow = computed(() => isInitialized.value && modalInstance.value !== null)

  const init = (customModalId = null) => {
    const targetId = customModalId || modalId
    
    if (!targetId) {
      console.warn('[useModal] No se proporcionó ID del modal')
      return false
    }

    const modalElement = document.getElementById(targetId)
    
    if (!modalElement) {
      console.warn(`[useModal] No se encontró el elemento con id: ${targetId}`)
      return false
    }

    modalInstance.value = new Modal(modalElement, {
      backdrop: 'static',
      keyboard: true,
      ...bootstrapOptions
    })

    modalElement.addEventListener('shown.bs.modal', handleShown)
    modalElement.addEventListener('hidden.bs.modal', handleHidden)

    isInitialized.value = true
    return true
  }

  const handleShown = () => {
    isVisible.value = true
    onShow?.()
  }

  const handleHidden = () => {
    isVisible.value = false
    onHide?.()
  }

  const show = (data = null) => {
    if (!canShow.value) {
      console.warn('[useModal] El modal no está inicializado')
      return
    }
    modalInstance.value.show()
  }

  const hide = () => {
    if (!canShow.value) return
    modalInstance.value.hide()
  }

  const toggle = () => {
    if (!canShow.value) return
    modalInstance.value.toggle()
  }

  const confirm = async (result = true) => {
    if (onConfirm) {
      const canClose = await onConfirm(result)
      if (canClose === false) return
    }
    hide()
  }

  const cancel = () => {
    hide()
  }

  const dispose = () => {
    if (modalInstance.value) {
      const modalElement = document.getElementById(modalId)
      if (modalElement) {
        modalElement.removeEventListener('shown.bs.modal', handleShown)
        modalElement.removeEventListener('hidden.bs.modal', handleHidden)
      }

      modalInstance.value.dispose()
      modalInstance.value = null
      isInitialized.value = false
      isVisible.value = false
    }
  }

  onMounted(() => {
    if (modalId) {
      setTimeout(() => {
        init()
      }, 0)
    }
  })

  onUnmounted(() => {
    dispose()
  })

  return {
    modalInstance,
    isVisible,
    isInitialized,
    canShow,
    init,
    show,
    hide,
    toggle,
    confirm,
    cancel,
    dispose
  }
}

export function useSimpleModal(options = {}) {
  const { onShow = null, onHide = null } = options

  const isVisible = ref(false)

  const show = () => {
    isVisible.value = true
    onShow?.()
  }

  const hide = () => {
    isVisible.value = false
    onHide?.()
  }

  const toggle = () => {
    isVisible.value = !isVisible.value
    isVisible.value ? onShow?.() : onHide?.()
  }

  return {
    isVisible,
    show,
    hide,
    toggle
  }
}
