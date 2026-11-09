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
  getIndividualTrainingPlansCenter: vi.fn()
}))

vi.mock('@/repositories/api', () => ({ api: apiMocks }))
vi.mock('bootstrap', () => ({
  Modal: vi.fn(() => ({ show: vi.fn() }))
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

  it('shows edit for pending or rejected plans, but not for sent plans', async () => {
    apiMocks.getIndividualTrainingPlansCenter.mockResolvedValue({
      data: {
        'hydra:member': [
          {
            id: 19,
            name: 'Pla rebutjat',
            status: 'rebutjada',
            courseYear: '2026/2027',
            courseLevel: 2,
            turn: 'presential',
            totalHours: 100,
            curricularProject: {
              id: 4,
              cycle: { shortName: 'DAW', department: { shortName: 'INFO' } }
            }
          }
        ],
        'hydra:totalItems': 1
      }
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

    expect(wrapper.find('[title="Rebutjar"]').exists()).toBe(false)
    expect(wrapper.find('[title="Editar pla"]').exists()).toBe(true)
    expect(wrapper.find('[title="Eliminar pla"]').exists()).toBe(true)

    wrapper.vm.plans[0].status = 'enviada'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[title="Rebutjar"]').exists()).toBe(false)
    expect(wrapper.find('[title="Editar pla"]').exists()).toBe(false)

    wrapper.vm.plans[0].status = 'pendent'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[title="Rebutjar"]').exists()).toBe(false)
    expect(wrapper.find('[title="Editar pla"]').exists()).toBe(true)
  })
})
