import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '@/stores/data'
import IndividualTrainingPlansPCC from '@/views/pcc/IndividualTrainingPlansPCC.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() })
}))

describe('IndividualTrainingPlansPCC', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads the PCC identified by the route and passes its ID to the plans component', async () => {
    const store = useDataStore()
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
    expect(wrapper.get('[data-testid="plans-component"]').text()).toBe('42')
  })
})
