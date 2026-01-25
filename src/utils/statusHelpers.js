// utils/statusHelpers.js

/**
 * Devuelve la clase CSS para un estado
 * @param {string} status - Estado del syllabus
 * @returns {string} Clase CSS de Bootstrap
 */
export function getStatusClass(status) {
  const statusMap = {
    pendent: 'badge bg-warning',
    enviada: 'badge bg-info',
    rebutjada: 'badge bg-danger',
    aprovada: 'badge bg-success'
  }

  return statusMap[status] || 'badge bg-dark'
}

/**
 * Devuelve el texto traducido de un estado
 * @param {string} status - Estado del syllabus
 * @returns {string} Texto traducido
 */
export function getStatusLabel(status) {
  const labels = {
    pendent: 'Pendent',
    enviada: 'Enviada',
    rebutjada: 'Rebutjada',
    aprovada: 'Aprovada'
  }

  return labels[status] || 'Desconegut'
}

/**
 * Devuelve el icono para un estado
 * @param {string} status - Estado del syllabus
 * @returns {string} Clase de icono Bootstrap
 */
export function getStatusIcon(status) {
  const icons = {
    pendent: 'bi-clock-fill',
    enviada: 'bi-send-fill',
    rebutjada: 'bi-x-circle-fill',
    aprovada: 'bi-check-circle-fill'
  }

  return icons[status] || 'bi-question-circle-fill'
}
