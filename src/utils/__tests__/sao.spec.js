import { describe, expect, it } from 'vitest'

import { isSaoExportActive, saoStatusClass, saoStatusLabel } from '../sao.js'

describe('SAÓ export status helpers', () => {
  it('identifies the statuses that need polling', () => {
    expect(isSaoExportActive('queued')).toBe(true)
    expect(isSaoExportActive('exporting')).toBe(true)
    expect(isSaoExportActive('exported')).toBe(false)
    expect(isSaoExportActive('exported_with_warnings')).toBe(false)
  })

  it('returns readable labels and bootstrap classes', () => {
    expect(saoStatusLabel('partial_failure')).toBe('Error parcial')
    expect(saoStatusLabel('exported_with_warnings')).toBe('Exportat amb avisos')
    expect(saoStatusClass('exported_with_warnings')).toBe('bg-warning text-dark')
    expect(saoStatusClass('failed')).toBe('bg-danger')
    expect(saoStatusLabel(null)).toBe('No exportat')
  })
})
