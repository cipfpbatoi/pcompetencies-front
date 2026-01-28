import { computed } from 'vue'

export function useModuleOrganization() {
  /**
   * Valida el formato de la distribución
   * Debe seguir el patrón: dígito(+dígito)*
   * Ejemplo: "2", "2+9", "1+2+3"
   */
  const validateDistributionFormat = (distribution) => {
    if (!distribution || typeof distribution !== 'string') {
      return false
    }

    const pattern = /^\d(\+\d){0,4}$/
    return pattern.test(distribution.trim())
  }

  /**
   * Calcula la suma de una distribución
   * Ejemplo: "2+9" => 11
   */
  const calculateDistributionSum = (distribution) => {
    if (!distribution || typeof distribution !== 'string') {
      return 0
    }

    const parts = distribution.split('+').map(part => parseInt(part.trim(), 10))
    return parts.reduce((sum, value) => sum + (isNaN(value) ? 0 : value), 0)
  }

  /**
   * Valida que la suma de la distribución coincida con las horas semanales del módulo
   */
  const validateDistributionSum = (distribution, weekHours) => {
    const sum = calculateDistributionSum(distribution)
    return sum === weekHours
  }

  /**
   * Valida que classroomHours + labHours = weekHours
   */
  const validateHoursSum = (classroomHours, labHours, weekHours) => {
    const classroom = parseInt(classroomHours, 10) || 0
    const lab = parseInt(labHours, 10) || 0
    return (classroom + lab) === weekHours
  }

  /**
   * Obtiene errores de validación para el formulario completo
   */
  const getValidationErrors = (formData, weekHours) => {
    const errors = {}

    // Validar distribution
    if (!formData.distribution) {
      errors.distribution = 'La distribució és obligatòria'
    } else if (!validateDistributionFormat(formData.distribution)) {
      errors.distribution = 'Format incorrecte. Ha de seguir el patró: 1+2+3'
    } else if (!validateDistributionSum(formData.distribution, weekHours)) {
      const sum = calculateDistributionSum(formData.distribution)
      errors.distribution = `La suma (${sum}) ha de coincidir amb les hores setmanals (${weekHours})`
    }

    // Validar classroomHours
    if (formData.classroomHours === null || formData.classroomHours === undefined || formData.classroomHours === '') {
      errors.classroomHours = 'Les hores d\'aula són obligatòries'
    } else if (formData.classroomHours < 0) {
      errors.classroomHours = 'Les hores d\'aula no poden ser negatives'
    }

    // Validar labHours
    if (formData.labHours === null || formData.labHours === undefined || formData.labHours === '') {
      errors.labHours = 'Les hores de laboratori són obligatòries'
    } else if (formData.labHours < 0) {
      errors.labHours = 'Les hores de laboratori no poden ser negatives'
    }

    // Validar suma de horas
    if (
      formData.classroomHours !== null &&
      formData.classroomHours !== undefined &&
      formData.labHours !== null &&
      formData.labHours !== undefined
    ) {
      if (!validateHoursSum(formData.classroomHours, formData.labHours, weekHours)) {
        const sum = (parseInt(formData.classroomHours, 10) || 0) + (parseInt(formData.labHours, 10) || 0)
        errors.hoursSum = `La suma d'hores d'aula i laboratori (${sum}) ha de ser igual a ${weekHours}`
      }
    }

    // Validar language
    if (!formData.language) {
      errors.language = 'L\'idioma és obligatori'
    }

    return errors
  }

  /**
   * Valida si el formulario es válido
   */
  const isFormValid = (formData, weekHours) => {
    const errors = getValidationErrors(formData, weekHours)
    return Object.keys(errors).length === 0
  }

  return {
    validateDistributionFormat,
    calculateDistributionSum,
    validateDistributionSum,
    validateHoursSum,
    getValidationErrors,
    isFormValid
  }
}
