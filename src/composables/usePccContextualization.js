// composables/useContextualization.js
import { ref, computed } from 'vue'

/**
 * Composable para manejar la contextualización
 * @param {Object} syllabus - Datos del syllabus (reactive)
 */
export function useContextualization(syllabus) {
  const showAll = ref({
    center: false,
    cycle: false
  })

  /**
   * Contextualización del centro (truncada o completa)
   */
  const centerContextualization = computed(() => {
    const text = syllabus.value.center?.contextualization || ''
    if (!text) return ''
    
    return showAll.value.center
      ? text
      : text.length > 200 
        ? text.substring(0, 200) + '...'
        : text
  })

  /**
   * Contextualización del ciclo (truncada o completa)
   */
  const cycleContextualization = computed(() => {
    const text = syllabus.value.cycleCenterContext?.studentsProfile || ''
    if (!text) return ''
    
    return showAll.value.cycle
      ? text
      : text.length > 200
        ? text.substring(0, 200) + '...'
        : text
  })

  /**
   * Indica si el grupo está contextualizado
   */
  const isDone = computed(() => {
    return !!syllabus.value.groupContext
  })

  /**
   * Alterna mostrar todo/menos para un tipo
   * @param {string} type - 'center' o 'cycle'
   */
  const toggleShowAll = (type) => {
    if (type in showAll.value) {
      showAll.value[type] = !showAll.value[type]
    }
  }

  /**
   * Obtiene el texto del botón "Mostrar"
   * @param {string} type - 'center' o 'cycle'
   * @returns {string} Texto del botón
   */
  const getButtonText = (type) => {
    return showAll.value[type] ? 'menys' : 'tot'
  }

  return {
    showAll,
    centerContextualization,
    cycleContextualization,
    isDone,
    toggleShowAll,
    getButtonText
  }
}
