// composables/useFormValidation.js
import { ref } from 'vue'

/**
 * Composable para validación de formularios con Yup
 * @param {Object} validationSchema - Schema de validación Yup
 */
export function useFormValidation(validationSchema) {
  const errors = ref({})
  const isValidating = ref(false)

  /**
   * Valida los datos del formulario
   * @param {Object} data - Datos a validar
   * @returns {Promise<boolean>} - true si es válido, false si hay errores
   */
  const validate = async (data) => {
    errors.value = {}
    isValidating.value = true

    try {
      await validationSchema.validate(data, { abortEarly: false })
      return true
    } catch (error) {
      if (error.inner) {
        error.inner.forEach((validationError) => {
          errors.value[validationError.path] = validationError.message
        })
      }
      return false
    } finally {
      isValidating.value = false
    }
  }

  /**
   * Limpia todos los errores
   */
  const clearErrors = () => {
    errors.value = {}
  }

  /**
   * Limpia un error específico
   * @param {string} field - Campo a limpiar
   */
  const clearError = (field) => {
    delete errors.value[field]
  }

  /**
   * Establece un error manualmente
   * @param {string} field - Campo con error
   * @param {string} message - Mensaje de error
   */
  const setError = (field, message) => {
    errors.value[field] = message
  }

  /**
   * Procesa errores del servidor (422)
   * @param {Object} serverError - Error del servidor
   */
  const handleServerError = (serverError) => {
    if (serverError.response?.status === 422) {
      const detail = serverError.response.data.detail
      if (typeof detail === 'string' && detail.includes(':')) {
        const [field, message] = detail.split(':').map(s => s.trim())
        setError(field, message)
      }
    }
  }

  return {
    errors,
    isValidating,
    validate,
    clearErrors,
    clearError,
    setError,
    handleServerError
  }
}
