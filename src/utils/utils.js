function makeCheckeableArray(array, selected) {
  if (!array || !array.length) return []
  let selectedArray = []
  if (selected && selected.length) {
    if (typeof selected[0] === 'object') {
      selectedArray = getObjectsIds(selected)
    } else {
      selectedArray = selected
    }
  }
  return array.map((item) => {
    return {
      ...item,
      checked: selectedArray.includes(item.id)
    }
  })
}

function getObjectsIds(array) {
  if (!array || !array.length) return []
  return array?.map((item) => item.id) || []
}

async function validateFormErrors(validationSchema, data) {
  try {
    // Valida los datos del formulario con Yup
    await validationSchema.validate(data, { abortEarly: false })
  } catch (error) {
    // Maneja los errores de validación y actualiza el estado de los errores
    const formattedErrors = {}
    if (error.inner) {
      error.inner.forEach((validationError) => {
        formattedErrors[validationError.path] = validationError.message
      })
      return formattedErrors
    }
    return {}
  }
  return {}
}

function statusClass(status) {
  switch (status) {
    case 'pendent':
      return 'badge bg-warning'
    case 'pending':
      return 'badge bg-warning'
    case 'enviada':
      return 'badge bg-info'
    case 'enviat':
      return 'badge bg-info'
    case 'sent':
      return 'badge bg-info'
    case 'rebutjada':
      return 'badge bg-danger'
    case 'rebutjat':
      return 'badge bg-danger'
    case 'rejected':
      return 'badge bg-danger'
    case 'aprovada':
      return 'badge bg-success'
    case 'aprovat':
      return 'badge bg-success'
    case 'approved':
      return 'badge bg-success'
    case 'verified':
      return 'badge bg-success'
    case 'verificat':
      return 'badge bg-success'
    default:
      return 'badge bg-dark'
  }
}

export { makeCheckeableArray, getObjectsIds, validateFormErrors, statusClass }
