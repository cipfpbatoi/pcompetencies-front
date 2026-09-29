import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api'
import LsDevActivity from '@/components/LsDevActivity.vue'

vi.mock('@/repositories/api', () => ({
  api: {
    getSyllabusMarkingActivities: vi.fn()
  }
}))

describe('LsDevActivity', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.mocked(api.getSyllabusMarkingActivities).mockResolvedValue({ data: [] })
  })

  it('shows marking activities when their learning result is unavailable', async () => {
    const store = useDataStore()
    store.$patch({
      syllabus: { id: 1 },
      module: { learningResults: [] }
    })
    const learningSituation = {
      id: 1,
      activities: [
        {
          id: 1,
          type: 'marking',
          position: 1,
          code: 'A1',
          description: 'Activitat de prova',
          hours: 1,
          assessmentTool: { name: 'Observació' },
          markingTool: { name: 'Rúbrica' },
          evaluationCriterias: [{ id: 1, learningResultId: 999, code: 'CA1' }]
        }
      ]
    }

    const wrapper = mount(LsDevActivity, {
      props: {
        type: 'marking',
        learningSituation
      },
      global: {
        plugins: [pinia]
      }
    })
    await flushPromises()

    expect(wrapper.vm.getRaNumberFromId(999)).toBeUndefined()
    expect(wrapper.find('.alert-danger').text()).toContain('no estan disponibles')
    expect(wrapper.find('tbody tr.text-danger').exists()).toBe(true)
    expect(wrapper.text()).toContain('CA1')
    expect(() => wrapper.vm.generateActivityDetails(learningSituation.activities[0])).not.toThrow()
  })
})
