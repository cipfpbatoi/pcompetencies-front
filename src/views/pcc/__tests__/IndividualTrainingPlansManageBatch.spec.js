import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api'
import IndividualTrainingPlansManage from '../IndividualTrainingPlansManage.vue'
import SaoExportAccessModal from '@/components/SaoExportAccessModal.vue'

vi.mock('@/repositories/api', () => ({
  api: {
    getCycles: vi.fn(),
    getSchoolYears: vi.fn(),
    getCurrentData: vi.fn(),
    getDepartments: vi.fn(),
    getIndividualTrainingPlansCenter: vi.fn(),
    exportIndividualTrainingPlansToSao: vi.fn(),
    exportIndividualTrainingPlanToSao: vi.fn(),
    getIndividualTrainingPlanSaoExport: vi.fn(),
    provideIndividualTrainingPlanSaoOtp: vi.fn()
  }
}))
vi.mock('bootstrap', () => ({ Modal: vi.fn(() => ({ show: vi.fn(), hide: vi.fn() })) }))

const plan = (id, overrides = {}) => ({
  id,
  name: `Pla ${id}`,
  status: 'aprovada',
  courseYear: '2026/2027',
  modules: [],
  curricularProject: { id: id + 100, cycle: {} },
  ...overrides
})

describe('IndividualTrainingPlansManage batch synchronization', () => {
  let wrapper
  const mountPlans = async (plans) => {
    api.getIndividualTrainingPlansCenter.mockResolvedValue({
      data: { 'hydra:member': plans, 'hydra:totalItems': 50 }
    })
    wrapper = mount(IndividualTrainingPlansManage, {
      global: { stubs: { IndividualTrainingPlanViewModal: true } }
    })
    await flushPromises()
    return wrapper
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    useDataStore().$patch({ user: { info: { roles: ['ROLE_ADMIN'] } } })
    api.getCycles.mockResolvedValue({ data: [] })
    api.getSchoolYears.mockResolvedValue({ data: [] })
    api.getDepartments.mockResolvedValue({ data: [] })
    api.getCurrentData.mockResolvedValue({ data: { currentSchoolYear: { course: '2026/2027' } } })
  })
  afterEach(() => {
    wrapper?.unmount()
  })

  it('limits selection to four eligible plans across pages and unlocks others when deselecting', async () => {
    await mountPlans([
      plan(1),
      plan(2),
      plan(3, { status: 'pendent' }),
      plan(4, { courseYear: '2025/2026' }),
      plan(5, { saoExportStatus: 'exporting' })
    ])
    expect(wrapper.get('[aria-label="Seleccionar Pla 3"]').element.disabled).toBe(true)
    expect(wrapper.get('[aria-label="Seleccionar Pla 4"]').element.disabled).toBe(true)
    expect(wrapper.get('[aria-label="Seleccionar Pla 5"]').element.disabled).toBe(true)
    await wrapper.get('[aria-label="Seleccionar Pla 1"]').setValue(true)
    await wrapper.get('[aria-label="Seleccionar Pla 2"]').setValue(true)
    wrapper.vm.applyPlansResponse({
      'hydra:member': [plan(6), plan(7), plan(8)],
      'hydra:totalItems': 50
    })
    await wrapper.vm.$nextTick()
    await wrapper.get('[aria-label="Seleccionar Pla 6"]').setValue(true)
    await wrapper.get('[aria-label="Seleccionar Pla 7"]').setValue(true)
    expect(wrapper.vm.selectedSaoPlans.map((item) => item.id)).toEqual([1, 2, 6, 7])
    expect(wrapper.get('[aria-label="Seleccionar Pla 8"]').element.disabled).toBe(true)
    expect(wrapper.get('[data-testid="sao-batch-export"]').text()).toContain('(4/4)')
    wrapper.vm.toggleSaoPlan(plan(8))
    expect(wrapper.vm.selectedSaoPlans).toHaveLength(4)
    await wrapper.get('[aria-label="Seleccionar Pla 6"]').setValue(false)
    expect(wrapper.get('[aria-label="Seleccionar Pla 8"]').element.disabled).toBe(false)
  })

  it('submits one batch with one set of credentials and OTP, and shows each final result', async () => {
    await mountPlans([plan(1), plan(2)])
    wrapper.vm.selectSaoPage()
    await wrapper.vm.$nextTick()
    await wrapper.get('[data-testid="sao-batch-export"]').trigger('click')
    const modal = wrapper.findComponent(SaoExportAccessModal)
    expect(modal.props('batchPlans').map((item) => item.name)).toEqual(['Pla 1', 'Pla 2'])
    expect(modal.props('allowForce')).toBe(true)
    api.exportIndividualTrainingPlansToSao.mockResolvedValue({
      data: {
        exports: [
          { planId: 1, status: 'queued' },
          { planId: 2, status: 'queued' }
        ]
      }
    })
    modal.vm.$emit('submit-credentials', {
      username: 'professor',
      password: 'secret',
      force: false
    })
    await flushPromises()
    expect(api.exportIndividualTrainingPlansToSao).toHaveBeenCalledTimes(1)
    expect(api.exportIndividualTrainingPlansToSao).toHaveBeenCalledWith({
      username: 'professor',
      password: 'secret',
      force: false,
      plans: [
        { pccId: 101, planId: 1 },
        { pccId: 102, planId: 2 }
      ]
    })
    expect(api.exportIndividualTrainingPlanToSao).not.toHaveBeenCalled()
    expect(wrapper.vm.selectedSaoPlans).toHaveLength(0)
    api.getIndividualTrainingPlanSaoExport.mockResolvedValue({
      data: { status: 'exporting', progressStage: 'otp_required' }
    })
    await wrapper.vm.refreshSaoBatch()
    await wrapper.vm.$nextTick()
    expect(modal.find('#saoOtp').exists()).toBe(true)
    api.provideIndividualTrainingPlanSaoOtp.mockResolvedValue({
      data: { status: 'exporting', progressStage: 'otp_submitted' }
    })
    await modal.get('#saoOtp').setValue('123456')
    modal.vm.$emit('submit-otp', '123456')
    await flushPromises()
    expect(api.provideIndividualTrainingPlanSaoOtp).toHaveBeenCalledTimes(1)
    expect(api.provideIndividualTrainingPlanSaoOtp).toHaveBeenCalledWith(101, 1, '123456')
    expect(modal.find('#saoOtp').exists()).toBe(false)
    api.getIndividualTrainingPlanSaoExport.mockImplementation(async (_pccId, planId) => ({
      data: { status: planId === 1 ? 'exported' : 'failed' }
    }))
    await wrapper.vm.refreshSaoBatch()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.saoBatchRunning).toBe(false)
    expect(wrapper.vm.saoBatchTimer).toBe(null)
    const summary = wrapper.get('[data-testid="sao-batch-summary"]')
    expect(summary.text()).toContain('Lot finalitzat')
    expect(summary.text()).toContain('Pla 1: Exportat')
    expect(summary.text()).toContain('Pla 2: Error')
    wrapper.vm.handleSaoExport(plan(1))
    wrapper.vm.rememberSaoExport(1, { status: 'queued' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.saoBatchRunning).toBe(false)
    expect(wrapper.vm.saoBatchSummary[0].status).toBe('exported')
  })

  it('keeps selection and shows server validation errors before starting a batch', async () => {
    await mountPlans([plan(1)])
    wrapper.vm.selectSaoPage()
    wrapper.vm.handleSaoBatchExport()
    api.exportIndividualTrainingPlansToSao.mockRejectedValue({
      response: { data: { detail: 'El pla ja no està aprovat.' } }
    })
    await wrapper.vm.submitSaoCredentials({
      username: 'professor',
      password: 'secret',
      force: false
    })
    expect(wrapper.vm.saoBatchStarted).toBe(false)
    expect(wrapper.vm.saoBatchBusy).toBe(false)
    expect(wrapper.vm.selectedSaoPlans).toHaveLength(1)
    expect(wrapper.findComponent(SaoExportAccessModal).text()).toContain(
      'El pla ja no està aprovat.'
    )
  })
})
