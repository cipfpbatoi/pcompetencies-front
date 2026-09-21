import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api'
import FinalQualify from '@/views/FinalQualify.vue'

vi.mock('@/repositories/api', () => ({
  api: {
    getFinalActivities: vi.fn()
  }
}))

vi.mock('bootstrap', () => ({
  Modal: class {
    show() {}
    hide() {}
  }
}))

const learningResult1 = {
  id: 1,
  number: 1,
  descriptor: 'RA disponible',
  evaluationCriterias: []
}

const validActivity = {
  id: 10,
  code: 'RG-PI-1',
  assessmentTool: { name: 'Prova' },
  ponderedLearningResults: [
    {
      learningResult: learningResult1,
      percentageWeight: 100,
      evaluationCriterias: []
    }
  ]
}

const invalidActivity = {
  id: 11,
  code: 'RG-PI-3',
  assessmentTool: { name: 'Prova' },
  ponderedLearningResults: [
    {
      learningResult: { id: 3, number: 3, descriptor: 'RA eliminat' },
      percentageWeight: 100,
      evaluationCriterias: []
    }
  ]
}

const anotherInvalidActivity = {
  id: 12,
  code: 'RG-PI-4',
  assessmentTool: { name: 'Prova' },
  ponderedLearningResults: [
    {
      learningResult: { id: 4, number: 4, descriptor: 'RA eliminat' },
      percentageWeight: 100,
      evaluationCriterias: []
    }
  ]
}

describe('FinalQualify', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.mocked(api.getFinalActivities).mockResolvedValue({
      data: { activities: [validActivity, invalidActivity, anotherInvalidActivity] }
    })
  })

  it('warns about activities linked to removed learning results without breaking the summary', async () => {
    const store = useDataStore()
    store.$patch({
      syllabus: {
        id: 1,
        module: { name: 'Mòdul de prova' },
        learningSituations: [
          {
            ponderedLearningResults: [{ learningResult: learningResult1, percentageWeight: 100 }]
          }
        ]
      },
      module: { learningResults: [learningResult1] },
      activitiesData: { assessmentTool: [], markingTool: [] }
    })

    const wrapper = mount(FinalQualify, {
      global: {
        plugins: [pinia],
        stubs: {
          AppBreadcrumb: true,
          LrTable: true,
          ModalComponent: { template: '<div><slot /></div>' },
          ShowTable: {
            props: ['data'],
            template: '<div><span v-for="item in data" :key="item.code">{{ item.code }}</span></div>'
          }
        }
      }
    })
    await flushPromises()

    expect(wrapper.find('.alert-danger').text()).toContain('RG-PI-3')
    expect(wrapper.find('.alert-danger').text()).toContain('RA3')
    expect(wrapper.find('.alert-danger').text()).toContain('RG-PI-4')
    expect(wrapper.find('.alert-danger').text()).toContain('RA4')
    expect(wrapper.vm.validFinalActivities).toEqual([validActivity])
    expect(wrapper.vm.activitiesPonderedLearningResults).toEqual({ RA1: { 'RG-PI-1': 100 } })
    expect(wrapper.vm.qualificationsSummaryColumns.map((column) => column.value)).not.toContain('RG-PI-3')
    expect(wrapper.vm.isInvalidFinalActivity(invalidActivity)).toBe('table-danger')
    expect(wrapper.vm.isInvalidFinalActivity(validActivity)).toBe('')
  })

  it('does not mark activities as invalid while learning results are loading', async () => {
    const store = useDataStore()
    store.$patch({
      syllabus: { id: 1, module: { name: 'Mòdul de prova' }, learningSituations: [] },
      module: {},
      activitiesData: { assessmentTool: [], markingTool: [] }
    })

    const wrapper = mount(FinalQualify, {
      global: {
        plugins: [pinia],
        stubs: {
          AppBreadcrumb: true,
          LrTable: true,
          ModalComponent: { template: '<div><slot /></div>' },
          ShowTable: true
        }
      }
    })
    await flushPromises()

    expect(wrapper.vm.invalidFinalActivities).toEqual([])
    expect(wrapper.vm.isInvalidFinalActivity(invalidActivity)).toBe('')
  })
})
