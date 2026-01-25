// composables/useArrayHelpers.js

/**
 * Composable con funciones auxiliares para arrays
 */
export function useArrayHelpers() {
  /**
   * Convierte un array en checkeable (añade propiedad 'checked')
   * @param {Array} array - Array original
   * @param {Array} selected - Array de elementos seleccionados (IDs u objetos)
   * @returns {Array} Array con propiedad 'checked'
   */
  const makeCheckableArray = (array, selected = []) => {
    if (!array?.length) return []

    // Normalizar array de seleccionados a IDs
    const selectedIds = selected.length
      ? (typeof selected[0] === 'object' 
          ? selected.map(item => item.id) 
          : selected)
      : []

    return array.map(item => ({
      ...item,
      checked: selectedIds.includes(item.id)
    }))
  }

  /**
   * Extrae los IDs de un array de objetos
   * @param {Array} array - Array de objetos
   * @returns {Array<number>} Array de IDs
   */
  const extractIds = (array) => {
    if (!array?.length) return []
    return array.map(item => item.id)
  }

  /**
   * Filtra elementos seleccionados (checked: true)
   * @param {Array} array - Array con propiedad 'checked'
   * @returns {Array} Elementos seleccionados
   */
  const getCheckedItems = (array) => {
    if (!array?.length) return []
    return array.filter(item => item.checked)
  }

  /**
   * Alterna el estado checked de un elemento
   * @param {Array} array - Array con propiedad 'checked'
   * @param {number|string} itemId - ID del elemento
   * @returns {Array} Array actualizado
   */
  const toggleChecked = (array, itemId) => {
    return array.map(item => 
      item.id === itemId 
        ? { ...item, checked: !item.checked }
        : item
    )
  }

  /**
   * Marca/desmarca todos los elementos
   * @param {Array} array - Array con propiedad 'checked'
   * @param {boolean} checked - Nuevo estado
   * @returns {Array} Array actualizado
   */
  const setAllChecked = (array, checked = true) => {
    return array.map(item => ({ ...item, checked }))
  }

  return {
    makeCheckableArray,
    extractIds,
    getCheckedItems,
    toggleChecked,
    setAllChecked
  }
}
