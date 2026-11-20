import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import { useDataStore } from '@/stores/data'
import IndividualTrainingPlansManage from '@/views/pcc/IndividualTrainingPlansManage.vue'
import SaoExportAccessModal from '@/components/SaoExportAccessModal.vue'

const apiMocks = vi.hoisted(() => ({
  getCycles: vi.fn(),
  getSchoolYears: vi.fn(),
  getCurrentData: vi.fn(),
  getDepartments: vi.fn(),
  getIndividualTrainingPlansCenter: vi.fn(),
  individualTrainingPlanSend: vi.fn(),
  individualTrainingPlanApprove: vi.fn()
}))

vi.mock('@/repositories/api', () => ({ api: apiMocks }))
vi.mock('bootstrap', () => ({
  Modal: vi.fn(() => ({ show: vi.fn(), hide: vi.fn() }))
}))

describe('IndividualTrainingPlansManage SAÓ warnings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    apiMocks.getCycles.mockResolvedValue({ data: [] })
    apiMocks.getSchoolYears.mockResolvedValue({ data: [] })
    apiMocks.getCurrentData.mockResolvedValue({
      data: { currentSchoolYear: { course: '2026/2027' } }
    })
    apiMocks.getDepartments.mockResolvedValue({ data: [] })
  })

  it('requests all department cycles for the FCT coordinator', async () => {
    apiMocks.getCycles.mockResolvedValue({
      data: [
        { id: 1, completeName: 'Cicle Informàtica' },
        { id: 2, completeName: 'Cicle Sanitat' }
      ]
    })
    apiMocks.getIndividualTrainingPlansCenter.mockResolvedValue({ data: [] })
    useDataStore().$patch({
      user: { info: { roles: ['ROLE_COORDINADOR_FCT'], department: { id: 1 } } }
    })
    const wrapper = mount(IndividualTrainingPlansManage, {
      global: { stubs: { IndividualTrainingPlanViewModal: true } }
    })
    await flushPromises()

    expect(apiMocks.getCycles).toHaveBeenCalledWith({ allDepartments: true })
    const cycleOptions = wrapper.findAll('select')[1].findAll('option')
    expect(cycleOptions.map((option) => option.text())).toEqual([
      '--- Tots els cicles ---',
      'Cicle Informàtica',
      'Cicle Sanitat'
    ])
    wrapper.unmount()
  })

  it('shows structured warnings and hides re-export for a finalized plan', async () => {
    const plan = {
      id: 18,
      name: 'Empresa programacio web',
      status: 'aprovada',
      saoExportStatus: 'exported_with_warnings',
      courseYear: '2026/2027',
      courseLevel: 2,
      turn: 'presential',
      totalHours: 100,
      modules: [{ code: '0614', name: 'Desplegament d’aplicacions web' }],
      curricularProject: {
        cycle: { shortName: 'DAW', department: { shortName: 'INFO' } }
      }
    }
    apiMocks.getIndividualTrainingPlansCenter.mockResolvedValue({
      data: { 'hydra:member': [plan], 'hydra:totalItems': 1 }
    })
    const store = useDataStore()
    store.$patch({ user: { info: { roles: ['ROLE_ADMIN'] } } })

    const wrapper = mount(IndividualTrainingPlansManage, {
      global: {
        stubs: {
          IndividualTrainingPlanViewModal: true
        }
      }
    })
    await flushPromises()

    const accessModal = wrapper.findComponent(SaoExportAccessModal)
    expect(accessModal.props('allowForce')).toBe(false)

    wrapper.vm.rememberSaoExport(18, {
      status: 'exported_with_warnings',
      modules: [{
        moduleCode: '0614',
        description: 'PCOMP-2026-2027-18-0614 - Empresa programacio web',
        status: 'exported_with_warnings',
        exportedAt: '2026-10-29T10:00:00+01:00',
        issues: [
          {
            code: 'AF03I',
            action: 'assigned',
            message: 'AF03I: s’ha assignat pel codi exacte, però la descripció no coincideix.'
          },
          {
            code: 'AF05H',
            action: 'omitted',
            message: 'AF05H: no s’ha trobat cap equivalència en SAÓ i s’ha omés.'
          }
        ]
      }]
    })
    wrapper.vm.saoAccessPlan = plan
    wrapper.vm.saoDetailsPlan = plan
    await wrapper.vm.$nextTick()

    expect(accessModal.props('allowForce')).toBe(true)
    const details = wrapper.get('#saoExportDetailsModal')
    expect(details.text()).toContain('Exportat amb avisos')
    expect(details.text()).toContain('0614 - Desplegament d’aplicacions web')
    expect(details.text()).toContain('PCOMP-2026-2027-18-0614 - Empresa programacio web')
    expect(details.text()).toContain('Assignada amb avís')
    expect(details.text()).toContain('AF03I')
    expect(details.text()).toContain('Omesa')
    expect(details.text()).toContain('AF05H')
    expect(wrapper.find('.bi-cloud-arrow-up-fill').exists()).toBe(false)
  })

  it('shows module codes with their names as tooltips and sends pending plans', async () => {
    const plan = {
      id: 19,
      name: 'Pla pendent',
      status: 'pendent',
      courseYear: '2026/2027',
      courseLevel: 2,
      turn: 'presential',
      totalHours: 100,
      modules: [{ code: '0614', name: 'Desplegament d’aplicacions web' }],
      curricularProject: {
        id: 4,
        cycle: { shortName: 'DAW', department: { shortName: 'INFO' } }
      }
    }
    apiMocks.getIndividualTrainingPlansCenter.mockResolvedValue({
      data: {
        'hydra:member': [plan],
        'hydra:totalItems': 1
      }
    })
    apiMocks.individualTrainingPlanSend.mockResolvedValue({ data: { ...plan, status: 'enviada' } })
    const store = useDataStore()
    store.$patch({ user: { info: { roles: ['ROLE_ADMIN'] } } })

    const wrapper = mount(IndividualTrainingPlansManage, {
      global: {
        stubs: {
          IndividualTrainingPlanViewModal: true
        }
      }
    })
    await flushPromises()

    expect(wrapper.get('[title="Desplegament d’aplicacions web"]').text()).toBe('0614')
    expect(wrapper.find('[title="Editar pla"]').exists()).toBe(true)
    expect(wrapper.find('[title="Enviar per a aprovació"]').exists()).toBe(true)
    expect(wrapper.find('[title="Eliminar pla"]').exists()).toBe(true)

    const confirmSpy = vi.spyOn(window, 'confirm')
    await wrapper.get('[title="Enviar per a aprovació"]').trigger('click')
    await flushPromises()

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(apiMocks.individualTrainingPlanSend).toHaveBeenCalledWith(4, 19, {})
    expect(wrapper.vm.plans[0].status).toBe('enviada')
    expect(wrapper.find('[title="Editar pla"]').exists()).toBe(false)
  })

  it('shows the reject action for plans sent for approval in the current school year', async () => {
    const plan = {
      id: 20,
      name: 'Pla enviat',
      status: 'enviada',
      courseYear: '2026/2027',
      courseLevel: 2,
      turn: 'presential',
      totalHours: 100,
      modules: [],
      curricularProject: {
        id: 4,
        cycle: { shortName: 'DAW', department: { shortName: 'INFO' } }
      }
    }
    apiMocks.getIndividualTrainingPlansCenter.mockResolvedValue({
      data: { 'hydra:member': [plan], 'hydra:totalItems': 1 }
    })
    const store = useDataStore()
    store.$patch({ user: { info: { roles: ['ROLE_ADMIN'] } } })

    const wrapper = mount(IndividualTrainingPlansManage, {
      global: {
        stubs: {
          IndividualTrainingPlanViewModal: true
        }
      }
    })
    await flushPromises()

    expect(wrapper.find('[title="Aprovar"]').exists()).toBe(true)
    expect(wrapper.find('[title="Rebutjar"]').exists()).toBe(true)
  })
})

describe('IndividualTrainingPlansManage approval', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    apiMocks.getCycles.mockResolvedValue({ data: [] })
    apiMocks.getSchoolYears.mockResolvedValue({ data: [] })
    apiMocks.getCurrentData.mockResolvedValue({
      data: { currentSchoolYear: { course: '2026/2027' } }
    })
    apiMocks.getDepartments.mockResolvedValue({ data: [] })
  })

  it('lists every validation reason and keeps the plan sent when approving is rejected', async () => {
    const plan = {
      id: 21,
      name: 'Pla enviat',
      status: 'enviada',
      courseYear: '2026/2027',
      courseLevel: 2,
      turn: 'presential',
      totalHours: 100,
      modules: [{ code: '0612', name: 'Desenvolupament web en entorn client' }],
      curricularProject: {
        id: 5,
        cycle: { shortName: 'DAW', department: { shortName: 'INFO' } }
      }
    }
    apiMocks.getIndividualTrainingPlansCenter.mockResolvedValue({
      data: { 'hydra:member': [plan], 'hydra:totalItems': 1 }
    })
    apiMocks.individualTrainingPlanApprove.mockRejectedValue({
      response: {
        status: 406,
        data: {
          error: true,
          detail: 'El pla formatiu individual no és correcte',
          reasons: {
            evaluationCriteriaLimit: ['El mòdul 0612 supera el 65%'],
            periods: ['Els periodes 1 i 2 se solapen en dates']
          }
        }
      }
    })
    const confirmSpy = vi.spyOn(window, 'confirm')
    const store = useDataStore()
    store.$patch({ user: { info: { roles: ['ROLE_ADMIN'] } } })

    const wrapper = mount(IndividualTrainingPlansManage, {
      global: { stubs: { IndividualTrainingPlanViewModal: true } }
    })
    await flushPromises()

    await wrapper.vm.handleApprovePlan(wrapper.vm.plans[0])
    await flushPromises()

    expect(confirmSpy).not.toHaveBeenCalled()

    expect(apiMocks.individualTrainingPlanApprove).toHaveBeenCalledWith(5, 21, {})
    const reasons = wrapper.get('[data-testid="action-error-reasons"]').findAll('li')
    expect(reasons.map((reason) => reason.text())).toEqual([
      'El mòdul 0612 supera el 65%',
      'Els periodes 1 i 2 se solapen en dates'
    ])
    expect(wrapper.vm.plans[0].status).toBe('enviada')
    expect(wrapper.find('[data-testid="force-action-button"]').exists()).toBe(false)

    await wrapper.get('[data-testid="reject-with-errors-button"]').trigger('click')

    expect(wrapper.vm.rejectPlanTarget.id).toBe(21)
    expect(wrapper.vm.rejectPlanReason).toBe(
      '- El mòdul 0612 supera el 65%\n- Els periodes 1 i 2 se solapen en dates'
    )
  })

  it('approves a plan over the criteria limit when the coordinator forces it', async () => {
    const plan = {
      id: 22,
      name: 'Pla forçat',
      status: 'enviada',
      courseYear: '2026-2027',
      evaluationCriteriaLimitJustification: "L'empresa cobreix quasi tot el mòdul",
      modules: [{ code: '0612', name: 'Desenvolupament web en entorn client' }],
      curricularProject: {
        id: 5,
        cycle: { shortName: 'DAW', department: { shortName: 'INFO' } }
      }
    }
    apiMocks.getIndividualTrainingPlansCenter.mockResolvedValue({
      data: { 'hydra:member': [plan], 'hydra:totalItems': 1 }
    })
    apiMocks.individualTrainingPlanApprove
      .mockReset()
      .mockRejectedValueOnce({
        response: {
          status: 406,
          data: {
            error: true,
            detail: 'El pla formatiu individual no és correcte',
            reasons: { evaluationCriteriaLimit: ['El mòdul 0612 supera el 75%'] },
            forceable: true
          }
        }
      })
      .mockResolvedValueOnce({ data: { ...plan, status: 'aprovada' } })
    const confirmSpy = vi.spyOn(window, 'confirm')
    const store = useDataStore()
    store.$patch({ user: { info: { roles: ['ROLE_ADMIN'] } } })

    const wrapper = mount(IndividualTrainingPlansManage, {
      global: { stubs: { IndividualTrainingPlanViewModal: true } }
    })
    await flushPromises()

    await wrapper.vm.handleApprovePlan(wrapper.vm.plans[0])
    await flushPromises()

    expect(confirmSpy).not.toHaveBeenCalled()

    expect(wrapper.get('[data-testid="force-approve-justification"]').text()).toContain(
      "L'empresa cobreix quasi tot el mòdul"
    )

    await wrapper.get('[data-testid="force-action-button"]').trigger('click')
    await flushPromises()

    expect(apiMocks.individualTrainingPlanApprove).toHaveBeenLastCalledWith(5, 22, { force: true })
    expect(wrapper.vm.plans[0].status).toBe('aprovada')
    expect(wrapper.find('[data-testid="force-action-button"]').exists()).toBe(false)
  })

  it('sends a plan over the criteria limit when it is forced with a justification', async () => {
    const plan = {
      id: 23,
      name: 'Pla per forçar',
      status: 'pendent',
      courseYear: '2026/2027',
      modules: [{ code: '0612', name: 'Desenvolupament web en entorn client' }],
      curricularProject: {
        id: 5,
        cycle: { shortName: 'DAW', department: { shortName: 'INFO' } }
      }
    }
    const justification = "L'empresa cobreix quasi tot el mòdul"
    apiMocks.getIndividualTrainingPlansCenter.mockResolvedValue({
      data: { 'hydra:member': [plan], 'hydra:totalItems': 1 }
    })
    apiMocks.individualTrainingPlanSend
      .mockReset()
      .mockRejectedValueOnce({
        response: {
          status: 406,
          data: {
            error: true,
            detail: 'El pla formatiu individual no és correcte',
            reasons: { evaluationCriteriaLimit: ['El mòdul 0612 supera el 75%'] },
            forceable: true
          }
        }
      })
      .mockResolvedValueOnce({
        data: { ...plan, status: 'enviada', evaluationCriteriaLimitJustification: justification }
      })
    const store = useDataStore()
    store.$patch({ user: { info: { roles: ['ROLE_ADMIN'] } } })

    const wrapper = mount(IndividualTrainingPlansManage, {
      global: { stubs: { IndividualTrainingPlanViewModal: true } }
    })
    await flushPromises()

    await wrapper.vm.handleSendPlan(wrapper.vm.plans[0])
    await flushPromises()

    // Enviar no mostra la justificació guardada ni el botó de rebutjar
    expect(wrapper.find('[data-testid="force-approve-justification"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="reject-with-errors-button"]').exists()).toBe(false)

    await wrapper.get('[data-testid="force-action-button"]').trigger('click')
    await flushPromises()

    expect(apiMocks.individualTrainingPlanSend).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="force-error"]').text()).toContain('mínim 8 caràcters')

    await wrapper.get('[data-testid="force-justification"]').setValue(justification)
    await wrapper.get('[data-testid="force-action-button"]').trigger('click')
    await flushPromises()

    expect(apiMocks.individualTrainingPlanSend).toHaveBeenLastCalledWith(5, 23, {
      force: true,
      justification
    })
    expect(wrapper.vm.plans[0].status).toBe('enviada')
    expect(wrapper.vm.plans[0].evaluationCriteriaLimitJustification).toBe(justification)
    expect(wrapper.find('[data-testid="forced-limit-icon"]').exists()).toBe(true)
  })
})
