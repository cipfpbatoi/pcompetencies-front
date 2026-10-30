export const SAO_ACTIVE_STATUSES = ['queued', 'exporting']

const SAO_STATUS_LABELS = {
  pending: 'Pendent',
  queued: 'En cua',
  exporting: 'Exportant',
  exported: 'Exportat',
  exported_with_warnings: 'Exportat amb avisos',
  outdated: 'Pendent d’actualitzar',
  partial_failure: 'Error parcial',
  failed: 'Error',
  obsolete: 'Obsoleta'
}

const SAO_STATUS_CLASSES = {
  pending: 'bg-secondary',
  queued: 'bg-secondary',
  exporting: 'bg-info text-dark',
  exported: 'bg-success',
  exported_with_warnings: 'bg-warning text-dark',
  outdated: 'bg-warning text-dark',
  partial_failure: 'bg-warning text-dark',
  failed: 'bg-danger',
  obsolete: 'bg-dark'
}

export const saoStatusLabel = (status) => SAO_STATUS_LABELS[status] || 'No exportat'

export const saoStatusClass = (status) => SAO_STATUS_CLASSES[status] || 'bg-light text-dark border'

export const isSaoExportActive = (status) => SAO_ACTIVE_STATUSES.includes(status)
