import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SyllabusesManage from '@/views/SyllabusesManage.vue'
import { api } from '@/repositories/api'

vi.mock('@/repositories/api', () => ({
  api: {
    getCycles: vi.fn(),
    getModules: vi.fn(),
    getCurrentData: vi.fn(),
    getSyllabusesPaginated: vi.fn()
  }
}))

vi.mock('@/router/index.js', () => ({ default: {} }))

vi.mock('bootstrap', () => ({
  Modal: class {
    show() {}
    hide() {}
  }
}))

const mountComponent = () =>
  mount(SyllabusesManage, {
    global: {
      stubs: { ModalComponent: true },
      mocks: {
        $route: { query: {} },
        $router: { replace: vi.fn(), push: vi.fn() }
      }
    }
  })

describe('SyllabusesManage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    api.getCycles.mockResolvedValue({ data: [] })
    api.getModules.mockResolvedValue({ data: [] })
    api.getCurrentData.mockResolvedValue({ data: { currentSchoolYear: { course: '2026-2027' } } })
    api.getSyllabusesPaginated.mockResolvedValue({ data: { 'hydra:member': [], 'hydra:totalItems': 0 } })
  })

  it('loads current syllabuses by default', async () => {
    mountComponent()
    await flushPromises()

    expect(api.getSyllabusesPaginated).toHaveBeenCalledWith(
      expect.stringContaining('schoolYear=current')
    )
  })

  it('loads previous active syllabuses from the second tab', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    api.getSyllabusesPaginated.mockClear()

    await wrapper.vm.setSyllabusTab('previous')

    expect(api.getSyllabusesPaginated).toHaveBeenCalledWith(
      expect.stringMatching(/schoolYear=previous.*module.active=1/)
    )
    expect(wrapper.vm.page).toBe(1)
  })

  it('loads inactive modules without a school-year filter from the third tab', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    api.getSyllabusesPaginated.mockClear()

    await wrapper.vm.setSyllabusTab('inactive')

    const filter = api.getSyllabusesPaginated.mock.calls[0][0]
    expect(filter).toContain('module.active=0')
    expect(filter).not.toContain('schoolYear=')
  })
})
