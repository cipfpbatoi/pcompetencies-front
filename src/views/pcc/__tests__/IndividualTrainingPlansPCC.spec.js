import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api'
import IndividualTrainingPlansPCC from '@/views/pcc/IndividualTrainingPlansPCC.vue'

vi.mock('@/repositories/api', () => ({
  api: {
    getPccIndividualTrainingPlans: vi.fn()
  }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() })
}))

describe('IndividualTrainingPlansPCC', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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
