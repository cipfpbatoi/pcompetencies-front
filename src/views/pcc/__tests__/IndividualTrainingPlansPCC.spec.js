import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api'
import IndividualTrainingPlansPCC from '@/views/pcc/IndividualTrainingPlansPCC.vue'

vi.mock('@/repositories/api', () => ({
  api: {
    getPccIndividualTrainingPlans: vi.fn(),
    getPCCById: vi.fn(),
    getCycleById: vi.fn(),
    getSyllabusById: vi.fn(),
    getAsessmentTool: vi.fn(),
    getMarkingTool: vi.fn(),
    getTrasversalObjectives: vi.fn()
  }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() })
}))

describe('IndividualTrainingPlansPCC', () => {
  const originalUrl = window.location.href

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', {})
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.replaceState({}, '', originalUrl)
  })

  it('keeps the plans when app initialization finishes after the view loads on refresh', async () => {
    window.history.replaceState({}, '', '/pcc/42/individual-training-plans')
    localStorage.token = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`
    localStorage.data = JSON.stringify({ syllabusId: 3, cycleId: 12 })
    localStorage.pccCycleId = '12'
    const store = useDataStore()
    store.loadCurrentUser = vi.fn().mockResolvedValue()
    let finishSyllabusLoad
    api.getSyllabusById.mockReturnValue(
      new Promise((resolve) => {
        finishSyllabusLoad = resolve
      })
    )
    api.getPCCById.mockImplementation(async () => ({
      data: { id: 42, cycle: { id: 12, completeName: 'Cicle de prova' } }
    }))
    api.getCycleById.mockResolvedValue({ data: { id: 12, modules: [] } })
    api.getAsessmentTool.mockResolvedValue({ data: [] })
    api.getMarkingTool.mockResolvedValue({ data: [] })
    api.getTrasversalObjectives.mockResolvedValue({ data: [] })
    const plans = [{ id: 7, name: 'Pla de prova' }]
    api.getPccIndividualTrainingPlans.mockResolvedValue({ data: plans })

    const initialization = store.loadData()
    const wrapper = mount(IndividualTrainingPlansPCC, {
      props: { pccId: 42 },
      global: { stubs: { PccIndividualTrainingPlans: true } }
    })
    await flushPromises()
    expect(store.pcc.individualTrainingPlans).toEqual(plans)

    finishSyllabusLoad({ data: { id: 3, module: {} } })
    await initialization
    await flushPromises()

    expect(api.getPCCById).toHaveBeenCalledTimes(1)
    expect(store.pcc.individualTrainingPlans).toEqual(plans)
    expect(wrapper.findComponent({ name: 'PccIndividualTrainingPlans' }).exists()).toBe(true)
    wrapper.unmount()
  })

  it('loads the PCC identified by the route and passes its ID to the plans component', async () => {
    const store = useDataStore()
    const plans = [{ id: 7, name: 'Pla de prova' }]
    api.getPccIndividualTrainingPlans.mockResolvedValue({ data: plans })
    store.loadPccById = vi.fn().mockImplementation(async (pccId) => {
      store.$patch({
        pcc: { id: pccId, cycle: { completeName: 'Cicle de prova' } },
        cycle: { id: 12, completeName: 'Cicle de prova' }
      })
      return store.pcc
    })

    const wrapper = mount(IndividualTrainingPlansPCC, {
      props: { pccId: 42 },
      global: {
        stubs: {
          PccIndividualTrainingPlans: {
            props: ['pccId'],
            template: '<div data-testid="plans-component">{{ pccId }}</div>'
          }
        }
      }
    })
    await flushPromises()

    expect(store.loadPccById).toHaveBeenCalledWith(42)
    expect(api.getPccIndividualTrainingPlans).toHaveBeenCalledWith(42)
    expect(store.pcc.individualTrainingPlans).toEqual(plans)
    expect(wrapper.get('[data-testid="plans-component"]').text()).toBe('42')
  })
})
