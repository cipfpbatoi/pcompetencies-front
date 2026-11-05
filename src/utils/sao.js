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

const SAO_PROGRESS_LABELS = {
  starting: 'Iniciant l’automatització…',
  configuration_loaded: 'Configuració carregada.',
  input_loaded: 'Dades del pla carregades.',
  artifacts_ready: 'Preparant el navegador segur…',
  launching_browser: 'Iniciant Chromium…',
  browser_started: 'Navegador iniciat.',
  opening_itaca: 'Obrint ITACA…',
  otp_required: 'Esperant el codi de verificació.',
  otp_submitted: 'Codi entregat. Verificant-lo…',
  authenticated: 'Sessió iniciada. Accedint a SAÓ…',
  templates_opened: 'Plantilles de SAÓ carregades.',
  module_started: 'Sincronitzant un mòdul…',
  module_completed: 'Mòdul sincronitzat.',
  module_failed: 'Mòdul finalitzat amb incidències.',
  completed: 'Comprovant el resultat final…'
}

export const saoProgressLabel = (saoExport) => {
  if (!saoExport?.progressStage) return 'Esperant que comence el procés…'
  if (saoExport.progressStage === 'module_started' && saoExport.progressModuleCode) {
    return `Sincronitzant el mòdul ${saoExport.progressModuleCode}…`
  }

  return SAO_PROGRESS_LABELS[saoExport.progressStage] || 'Sincronització en curs…'
}
