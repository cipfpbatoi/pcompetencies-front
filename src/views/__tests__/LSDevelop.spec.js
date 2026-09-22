import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api'
import LSDevelop from '@/views/LSDevelop.vue'

vi.mock('@/repositories/api', () => ({
  api: {
    getLearningSituationById: vi.fn(),
    getAvailableSyllabusAssessmentTools: vi.fn(),
    getAvailableSyllabusMethodologicalPrinciples: vi.fn(),
    saveLearningSituationMethodologies: vi.fn()
  }
}))

vi.mock('bootstrap', () => ({
  Modal: class {
    show() {}
    hide() {}
  }
}))

const learningSituation = {
  id: 2,
  position: 1,
  title: 'Situació de prova',
  hours: 20,
  generalObjectives: [],
  didacticObjectives: '',
  transversalObjectivesItems: [],
  competences: [],
  methodologicalPrinciples: [],
  didacticContents: [],
  ponderedLearningResults: [],
  activities: [{ id: 1, type: 'marking', description: 'Activitat conservada' }]
}

describe('LSDevelop', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    vi.mocked(api.getLearningSituationById).mockResolvedValue({ data: learningSituation })
    vi.mocked(api.getAvailableSyllabusAssessmentTools).mockResolvedValue({ data: { available: [] } })
    vi.mocked(api.getAvailableSyllabusMethodologicalPrinciples).mockResolvedValue({
      data: { available: [{ id: 3, category: 'methodology', selected: true }] }
    })
    vi.mocked(api.saveLearningSituationMethodologies).mockResolvedValue({
      data: { id: 2, methodologicalPrinciples: [{ id: 3 }] }
    })
  })

  it('reloads the complete learning situation after saving methodologies', async () => {
    const store = useDataStore()
    store.$patch({ syllabus: { id: 1, learningSituations: [learningSituation] }, module: {} })

    const wrapper = mount(LSDevelop, {
      props: { lsId: 2 },
      global: {
        plugins: [pinia],
        stubs: {
          AppBreadcrumb: true,
          ModalComponent: { template: '<div><slot /></div>' },
          ObjectivesModal: true,
          ShowTable: true,
          LsDevContents: true,
          LsDevActivity: true
        }
      }
    })
    await flushPromises()

    const hide = vi.fn()
    wrapper.vm.modal = 'methodologies'
    wrapper.vm.GenericModal = { hide }
    wrapper.vm.methodologiesCheckeables = [{ id: 3, checked: true }]
    await wrapper.vm.saveData()

    expect(api.getLearningSituationById).toHaveBeenCalledTimes(2)
    expect(wrapper.vm.learningSituation.activities).toEqual(learningSituation.activities)
    expect(hide).toHaveBeenCalledOnce()
  })
})
