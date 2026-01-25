import { ref } from 'vue'

/**
 * Composable para gestionar un modal individual
 * 
 * @param {Object} config - Configuración del modal
 * @returns {Object} - Ref, configuración y métodos para el modal
 * 
 * @example
 * const opportunitiesModal = useModal({
 *   modalId: 'opportunitiesModal',
 *   title: 'Oportunitats',
 *   size: 'lg'
 * })
 * 
 * // Usar en template
 * <ModalComponent 
 *   :ref="opportunitiesModal.modalRef"
 *   v-bind="opportunitiesModal.config"
 *   @save="handleSave"
 * />
 * 
 * // Controlar el modal
 * opportunitiesModal.show()
 * opportunitiesModal.hide()
 */
export function useModal(config = {}) {
  // ==========================================
  // 📊 ESTADO
  // ==========================================
  
  const modalRef = ref(null)
  const modalConfig = { ...config }

  // ==========================================
  // 🔧 MÉTODOS
  // ==========================================
  
  /**
   * Muestra el modal
   */
  const show = () => {
    modalRef.value?.show()
  }

  /**
   * Oculta el modal
   */
  const hide = () => {
    modalRef.value?.hide()
  }

  /**
   * Alterna la visibilidad del modal
   */
  const toggle = () => {
    modalRef.value?.toggle()
  }

  // ==========================================
  // 📤 RETORNO
  // ==========================================
  
  return {
    // Ref al componente modal
    modalRef,
    
    // Configuración del modal (para v-bind)
    config: modalConfig,
    
    // Métodos para controlar el modal
    show,
    hide,
    toggle
  }
}