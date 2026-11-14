import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import HomeView from '@/views/HomeView.vue'
import { api } from '@/repositories/api'

const route = {
  name: 'selectedSyllabus',
  params: { cycleId: '1', moduleCode: 'external-code' },
  query: { itacaCode: 'ITACA-01' }
}

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() })
}))

vi.mock('@/repositories/api', () => ({
  api: {
    getCycles: vi.fn(),
    getCurrentData: vi.fn(),
    getSchoolYears: vi.fn(),
    getCycleById: vi.fn(),
    getPCCByCycleId: vi.fn(),
    getSyllabusByCycleAndModule: vi.fn(),
    syllabusToCopy: vi.fn()
  }
}))

vi.mock('@/composables/usePCCManagement', () => ({
  usePCCManagement: () => ({
    pcc: ref({}),
    isLoadingPCC: ref(false),
    hasLoadedPCC: ref(true),
    startPCCLoading: vi.fn(),
    loadPCC: vi.fn(),
    hasPCC: () => false,
    createPCC: vi.fn(),
    copyPccUrl: vi.fn()
  })
}))

describe('HomeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.params = { cycleId: '1', moduleCode: 'external-code' }
    route.query = { itacaCode: 'ITACA-01' }
    api.getCycles.mockResolvedValue({ data: [] })
    api.getCurrentData.mockResolvedValue({ data: {} })
    api.getSchoolYears.mockResolvedValue({ data: [] })
    api.getPCCByCycleId.mockResolvedValue({ data: {} })
    api.getCycleById.mockResolvedValue({
      data: {
        id: 1,
        modules: [{ code: 'internal-code', codeItaca: 'ITACA-01', name: 'Mòdul de prova' }],
        availableTurns: []
      }
    })
    api.getSyllabusByCycleAndModule.mockResolvedValue({ data: [] })
    api.syllabusToCopy.mockResolvedValue({ data: [] })
  })

  it('selects the module by its ITACA code when its external code is not available', async () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          ModalComponent: true,
          ActionButton: true,
          ShowPdfButton: true,
          BtnGetExcel: true,
          HistorySyllabusList: true,
          HistoryPccList: true
        }
      }
    })
    await flushPromises()

    expect(api.getSyllabusByCycleAndModule).toHaveBeenCalledWith('1', 'internal-code')
    expect(wrapper.findAll('select')[1].element.value).toBe('internal-code')
  })
})
