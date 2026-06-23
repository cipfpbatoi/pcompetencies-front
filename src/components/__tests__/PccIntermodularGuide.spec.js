import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '@/stores/data'
import PccIntermodularGuide from '@/components/PccIntermodularGuide.vue'

const projectLearningResult = {
  id: 101,
  number: 1,
  descriptor: 'RA projecte'
}

const supportLearningResult1 = {
  id: 201,
  number: 1,
  descriptor: 'RA suport 1'
}

const supportLearningResult2 = {
  id: 202,
  number: 2,
  descriptor: 'RA suport 2'
}

const getBaseState = () => ({
  pcc: {
    id: 999,
    modules: [
      {
        code: 'PI1',
        name: 'Projecte 1r',
        courseLevel: 1,
        proyect: true,
        learningResults: [projectLearningResult]
      },
      {
        code: 'PI2',
        name: 'Projecte 2n',
        courseLevel: 2,
        proyect: true,
        learningResults: [projectLearningResult]
      },
      {
        code: 'M01',
        name: 'Mòdul suport 1r',
        courseLevel: 1,
        learningResults: [supportLearningResult1, supportLearningResult2]
      },
      {
        code: 'M02',
        name: 'Mòdul suport 2n',
        courseLevel: 2,
        learningResults: [supportLearningResult1]
      }
    ],
    intermodularProjectGuide: {
      firstCourseGuide: { temporalizationOption: 'center_attendance', weight: 50 },
      secondCourseGuide: { temporalizationOption: 'center_attendance', weight: 50 }
    },
    intermodularProjectLearningResultDistributions: [
      { learningResult: projectLearningResult, courseLevels: [1, 2] }
    ],
    intermodularProjectModuleOrientations: []
  },
  cycle: {
    modules: [
      { code: 'PI1', name: 'Projecte 1r', learningResults: [projectLearningResult] },
      { code: 'PI2', name: 'Projecte 2n', learningResults: [projectLearningResult] },
      { code: 'M01', name: 'Mòdul suport 1r', learningResults: [supportLearningResult1, supportLearningResult2] },
      { code: 'M02', name: 'Mòdul suport 2n', learningResults: [supportLearningResult1] }
    ]
  }
})

const mockActions = (store) => {
  store.savePCCIntermodularGuide = vi.fn().mockResolvedValue('ok')
  store.savePCCIntermodularDistribution = vi.fn().mockResolvedValue('ok')
  store.deletePCCIntermodularDistribution = vi.fn().mockResolvedValue(true)
  store.savePCCIntermodularParticipant = vi.fn().mockResolvedValue('ok')
  store.deletePCCIntermodularParticipant = vi.fn().mockResolvedValue(true)
  store.savePCCIntermodularOrientation = vi.fn().mockResolvedValue('ok')
  store.deletePCCIntermodularOrientation = vi.fn().mockResolvedValue(true)
}

const mountComponent = () => {
  return mount(PccIntermodularGuide, {
    props: { pccId: 999 },
    global: {
      stubs: {
        Teleport: true,
        ckeditor: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: `<textarea :value="modelValue" @input="$emit('update:modelValue', $event.target.value)"></textarea>`
        }
      }
    }
  })
}

describe('PccIntermodularGuide', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows informative non-editable distribution when project exists in one course only', async () => {
    const store = useDataStore()
    const state = getBaseState()
    state.pcc.modules = state.pcc.modules.filter((module) => !['PI1', 'M01'].includes(module.code))
    state.cycle.modules = state.cycle.modules.filter((module) => !['PI1', 'M01'].includes(module.code))
    store.$patch(state)
    mockActions(store)

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('La distribució de RA és informativa.')
    expect(wrapper.find('[data-testid="distribution-switch-101"]').exists()).toBe(false)
  })

  it('updates project RA distribution with courseLevels payload', async () => {
    const store = useDataStore()
    store.$patch(getBaseState())
    mockActions(store)

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('[data-testid="distribution-option-101-2"]').trigger('click')
    await flushPromises()

    expect(store.savePCCIntermodularDistribution).toHaveBeenCalledWith(999, {
      learningResultId: 101,
      courseLevels: [2]
    })
  })

  it('filters participant module options by course rules', async () => {
    const store = useDataStore()
    store.$patch(getBaseState())
    mockActions(store)

    const wrapper = mountComponent()
    await flushPromises()

    const selectCourse1 = wrapper.find('[data-testid="participant-select-1"]')
    const selectCourse2 = wrapper.find('[data-testid="participant-select-2"]')

    expect(selectCourse1.text()).toContain('M01')
    expect(selectCourse1.text()).not.toContain('M02')
    expect(selectCourse1.text()).not.toContain('PI1')

    expect(selectCourse2.text()).not.toContain('M01')
    expect(selectCourse2.text()).toContain('M02')
    expect(selectCourse2.text()).not.toContain('PI2')
  })

  it('allows first and second course modules when project exists only in second course', async () => {
    const store = useDataStore()
    const state = getBaseState()
    state.pcc.modules = state.pcc.modules.filter((module) => module.code !== 'PI1')
    state.cycle.modules = state.cycle.modules.filter((module) => module.code !== 'PI1')
    store.$patch(state)
    mockActions(store)

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('[data-testid="participant-select-1"]').exists()).toBe(false)

    const selectCourse2 = wrapper.find('[data-testid="participant-select-2"]')
    expect(selectCourse2.text()).toContain('M01')
    expect(selectCourse2.text()).toContain('M02')
    expect(selectCourse2.text()).not.toContain('PI2')
    expect(wrapper.text()).toContain('Orientacions mòduls 1r i 2n curs')
  })

  it('adds a first course module to second course project with second course payload', async () => {
    const store = useDataStore()
    const state = getBaseState()
    state.pcc.modules = state.pcc.modules.filter((module) => module.code !== 'PI1')
    state.cycle.modules = state.cycle.modules.filter((module) => module.code !== 'PI1')
    store.$patch(state)
    mockActions(store)

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('[data-testid="participant-select-2"]').setValue('M01')
    await wrapper.find('[data-testid="add-participant-2"]').trigger('click')
    await flushPromises()

    expect(store.savePCCIntermodularParticipant).toHaveBeenCalledWith(
      999,
      {
        moduleCode: 'M01',
        courseLevel: 2
      },
      { showSuccessMessage: false }
    )
  })

  it('adds participant by course with minimal payload', async () => {
    const store = useDataStore()
    const state = getBaseState()
    state.pcc.intermodularProjectParticipatingModules = [
      { module: { code: 'M01', name: 'Mòdul suport 1r' }, courseLevel: 1 }
    ]
    state.pcc.intermodularProjectModuleOrientations = [
      { module: { code: 'M01', name: 'Mòdul suport 1r' }, courseLevel: 1 }
    ]
    store.$patch(state)
    mockActions(store)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('[data-testid="participant-select-2"]').setValue('M02')
    await wrapper.find('[data-testid="add-participant-2"]').trigger('click')
    await flushPromises()

    expect(store.savePCCIntermodularParticipant).toHaveBeenCalledWith(
      999,
      {
        moduleCode: 'M02',
        courseLevel: 2
      },
      { showSuccessMessage: false }
    )

    expect(store.deletePCCIntermodularParticipant).not.toHaveBeenCalled()
  })

  it('blocks participant selection until temporalization and weights are saved', async () => {
    const store = useDataStore()
    const state = getBaseState()
    state.pcc.intermodularProjectGuide = {
      firstCourseGuide: {},
      secondCourseGuide: {}
    }
    store.$patch(state)
    mockActions(store)

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('Primer has de completar i guardar el punt 8.1')
    expect(wrapper.find('[data-testid="participant-select-1"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-testid="add-participant-1"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('abans d’afegir mòduls participants')
    expect(store.savePCCIntermodularParticipant).not.toHaveBeenCalled()
  })

  it('removes participant module by course', async () => {
    const store = useDataStore()
    const state = getBaseState()
    state.pcc.intermodularProjectParticipatingModules = [
      { module: { code: 'M01', name: 'Mòdul suport 1r' }, courseLevel: 1 }
    ]
    state.pcc.intermodularProjectModuleOrientations = [
      { module: { code: 'M01', name: 'Mòdul suport 1r' }, courseLevel: 1 }
    ]
    store.$patch(state)
    mockActions(store)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('[data-testid="remove-participant-1-M01"]').trigger('click')
    await flushPromises()

    expect(store.deletePCCIntermodularParticipant).toHaveBeenCalledWith(999, 'M01', 1, {
      showSuccessMessage: false
    })
  })

  it('saves and deletes orientation for module+course with support RA only', async () => {
    const store = useDataStore()
    const state = getBaseState()
    state.pcc.intermodularProjectParticipatingModules = [
      { module: { code: 'M01', name: 'Mòdul suport 1r' }, courseLevel: 1 }
    ]
    state.pcc.intermodularProjectModuleOrientations = [
      {
        module: { code: 'M01', name: 'Mòdul suport 1r' },
        supportLearningResultIds: [201, 202],
        supportLearningResults: [supportLearningResult1, supportLearningResult2],
        courseLevel: 1,
        supportActivitiesGuidance: 'Guidance inicial'
      }
    ]
    store.$patch(state)
    mockActions(store)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('[data-testid="edit-orientation-1-M01"]').trigger('click')
    await flushPromises()

    await wrapper
      .find('[data-testid="orientation-guidance-editor"]')
      .setValue('<p><strong>Guidance actualitzada</strong></p>')
    await wrapper.find('.modal-footer .btn.btn-primary').trigger('click')
    await flushPromises()

    expect(store.savePCCIntermodularOrientation).toHaveBeenCalledWith(
      999,
      expect.objectContaining({
        moduleCode: 'M01',
        courseLevel: 1,
        orientations: {
          supportLearningResultIds: [201, 202],
          supportActivitiesGuidance: '<p><strong>Guidance actualitzada</strong></p>'
        }
      })
    )

    await wrapper.find('.btn.btn-sm.btn-danger').trigger('click')
    await flushPromises()

    expect(store.deletePCCIntermodularOrientation).toHaveBeenCalledWith(999, 'M01', 1)
  })

  it('shows an error when saving orientation without support RA', async () => {
    const store = useDataStore()
    const state = getBaseState()
    state.pcc.intermodularProjectParticipatingModules = [
      { module: { code: 'M01', name: 'Mòdul suport 1r' }, courseLevel: 1 }
    ]
    store.$patch(state)
    mockActions(store)

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('[data-testid="add-orientation-1-M01"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="orientation-guidance-editor"]').setValue('<p>Orientació completa</p>')
    await wrapper.find('[data-testid="save-orientation"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Selecciona almenys un RA de suport.')
    expect(store.savePCCIntermodularOrientation).not.toHaveBeenCalled()
  })

  it('saves orientation using project block course level for first course module in second course project', async () => {
    const store = useDataStore()
    const state = getBaseState()
    state.pcc.modules = state.pcc.modules.filter((module) => module.code !== 'PI1')
    state.cycle.modules = state.cycle.modules.filter((module) => module.code !== 'PI1')
    state.pcc.intermodularProjectParticipatingModules = [
      { module: { code: 'M01', name: 'Mòdul suport 1r' }, courseLevel: 2 }
    ]
    store.$patch(state)
    mockActions(store)

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('[data-testid="add-orientation-2-M01"]').trigger('click')
    await flushPromises()

    await wrapper.find('#support-learning-result-201').setValue(true)
    await wrapper.find('[data-testid="orientation-guidance-editor"]').setValue('<p>Orientació segon curs</p>')
    await wrapper.find('[data-testid="save-orientation"]').trigger('click')
    await flushPromises()

    expect(store.savePCCIntermodularOrientation).toHaveBeenCalledWith(
      999,
      expect.objectContaining({
        moduleCode: 'M01',
        courseLevel: 2
      })
    )
  })

  it('shows real module course next to modules when project has a single course', async () => {
    const store = useDataStore()
    const state = getBaseState()
    state.pcc.modules = state.pcc.modules.filter((module) => module.code !== 'PI1')
    state.cycle.modules = state.cycle.modules.filter((module) => module.code !== 'PI1')
    state.pcc.intermodularProjectParticipatingModules = [
      { module: { code: 'M01', name: 'Mòdul suport 1r' }, courseLevel: 2 },
      { module: { code: 'M02', name: 'Mòdul suport 2n' }, courseLevel: 2 }
    ]
    store.$patch(state)
    mockActions(store)

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toMatch(/M01 - Mòdul suport 1r\s+\(1r curs\)/)
    expect(wrapper.text()).toMatch(/M02 - Mòdul suport 2n\s+\(2n curs\)/)
  })
})
