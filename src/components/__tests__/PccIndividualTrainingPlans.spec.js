import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api.js'
import PccIndividualTrainingPlans from '@/components/PccIndividualTrainingPlans.vue'

vi.mock('@/repositories/api.js', () => ({
  api: {
    getCurrentData: vi.fn().mockResolvedValue({ data: { currentSchoolYear: { course: '2026-2027' } } }),
    getIndividualTrainingPlanAvailableItems: vi.fn(),
    getIndividualTrainingPlan: vi.fn(),
    getIndividualTrainingPlanSaoExport: vi.fn(),
    exportIndividualTrainingPlanToSao: vi.fn()
  }
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() })
}))

const mountComponent = () =>
  mount(PccIndividualTrainingPlans, {
    props: { pccId: 1 },
    global: {
      stubs: {
        ModalComponent: {
          template: '<div><slot name="header" /><slot /><slot name="footer" /></div>',
          methods: {
            show() {},
            hide() {}
          }
        },
        ActionButton: true
      }
    }
  })

describe('PccIndividualTrainingPlans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCurrentData.mockResolvedValue({ data: { currentSchoolYear: { course: '2026-2027' } } })
    setActivePinia(createPinia())
    const store = useDataStore()
    store.$patch({
      pcc: { individualTrainingPlans: [] },
      cycle: { availableTurns: [] },
      user: { info: { roles: [] } }
    })
  })

  it('allows a tutor to export an approved current-year plan to SAÓ', async () => {
    const store = useDataStore()
    store.$patch({
      pcc: {
        individualTrainingPlans: [
          {
            id: 18,
            name: 'Empresa de programació web',
            status: 'aprovada',
            courseYear: '2026-2027',
            turn: 'presential',
            courseLevel: 2,
            moduleHours: []
          }
        ]
      },
      user: { info: { roles: ['ROLE_TEACHER'] } }
    })
    api.exportIndividualTrainingPlanToSao.mockResolvedValue({
      status: 202,
      data: { status: 'queued', modules: [] }
    })
    vi.stubGlobal('confirm', vi.fn(() => true))

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.get('[data-testid="sao-export-button"]').trigger('click')
    await flushPromises()

    expect(api.exportIndividualTrainingPlanToSao).toHaveBeenCalledWith(1, 18)
    expect(wrapper.text()).toContain('En cua')
    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('does not offer another export when the tutor plan is already synchronized', async () => {
    const store = useDataStore()
    store.$patch({
      pcc: {
        individualTrainingPlans: [
          {
            id: 18,
            name: 'Empresa de programació web',
            status: 'aprovada',
            courseYear: '2026-2027',
            turn: 'presential',
            courseLevel: 2,
            moduleHours: [],
            saoExportStatus: 'exported_with_warnings'
          }
        ]
      },
      user: { info: { roles: ['ROLE_TEACHER'] } }
    })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('[data-testid="sao-export-button"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Exportat amb avisos')
  })

  it('shows and hides the contextual help for the plan fields', async () => {
    const wrapper = mountComponent()
    const authorizationsButton = wrapper.get(
      '[aria-label="Mostra informació i exemples de les autoritzacions extraordinàries"]'
    )
    const observationsButton = wrapper.get(
      '[aria-label="Mostra informació i exemples de les observacions"]'
    )

    expect(wrapper.find('#extraordinaryAuthorizationsHelp').exists()).toBe(false)
    expect(wrapper.find('#observationsHelp').exists()).toBe(false)

    await authorizationsButton.trigger('click')

    expect(wrapper.get('#extraordinaryAuthorizationsHelp').text()).toContain('dies festius o caps de setmana')
    expect(authorizationsButton.attributes('aria-expanded')).toBe('true')

    await observationsButton.trigger('click')

    expect(wrapper.get('#observationsHelp').text()).toContain('apartats anteriors')
    expect(observationsButton.attributes('aria-expanded')).toBe('true')

    wrapper.vm.currentStep = 3
    await wrapper.vm.$nextTick()

    const coordinationButton = wrapper.get(
      '[aria-label="Mostra informació i exemples dels mecanismes de coordinació i seguiment"]'
    )
    const periodicityButton = wrapper.get(
      '[aria-label="Mostra informació i exemples de la periodicitat de les visites"]'
    )
    const periodsButton = wrapper.get(
      '[aria-label="Mostra informació i exemples dels períodes de formació en empresa"]'
    )

    expect(wrapper.find('#coordinationMechanismsHelp').exists()).toBe(false)
    expect(wrapper.find('#visitPeriodicityHelp').exists()).toBe(false)
    expect(wrapper.find('#trainingPeriodsHelp').exists()).toBe(false)

    await coordinationButton.trigger('click')

    expect(wrapper.get('#coordinationMechanismsHelp').text()).toContain('Microsoft Teams')
    expect(coordinationButton.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('#visitPeriodicityHelp').exists()).toBe(false)

    await periodicityButton.trigger('click')

    expect(wrapper.get('#visitPeriodicityHelp').text()).toContain('Visita inicial durant la primera setmana')
    expect(periodicityButton.attributes('aria-expanded')).toBe('true')

    await periodsButton.trigger('click')

    expect(wrapper.get('#trainingPeriodsHelp').text()).toContain("perruqueries, hospitals privats")
    expect(periodsButton.attributes('aria-expanded')).toBe('true')

    await coordinationButton.trigger('click')

    expect(wrapper.find('#coordinationMechanismsHelp').exists()).toBe(false)
    expect(coordinationButton.attributes('aria-expanded')).toBe('false')
  })

  it('does not save a plan with a period missing its company type', async () => {
    const store = useDataStore()
    store.createIndividualTrainingPlan = vi.fn()

    const wrapper = mountComponent()
    wrapper.vm.modules = [
      {
        moduleCode: 'M01',
        moduleName: 'Mòdul de prova',
        learningResults: [{ id: 1, number: 1, allCriteriaEligible: false, evaluationCriterias: [] }]
      }
    ]
    wrapper.vm.selectedLearningResultIds = new Set([1])
    wrapper.vm.form.name = 'Pla de prova'
    wrapper.vm.form.turn = 'presential'
    wrapper.vm.form.courseLevel = 1
    wrapper.vm.form.moduleHours = { M01: 10 }
    wrapper.vm.form.periods = [{ startDate: '2026-01-01', endDate: '2026-01-31', hours: 10, company: '' }]

    await wrapper.vm.handleSavePlan()
    await wrapper.vm.$nextTick()

    expect(store.createIndividualTrainingPlan).not.toHaveBeenCalled()
    expect(
      wrapper.get('input[placeholder="Ex: Empreses de programació, perruqueries, hospitals públics..."]').classes()
    ).toContain('is-invalid')
    expect(wrapper.text()).toContain("Cal indicar el tipus d'empresa.")
  })

  it('groups selected criteria by learning result without spaces after commas', async () => {
    const wrapper = mountComponent()
    wrapper.vm.modules = [
      {
        moduleCode: 'M01',
        moduleName: 'Mòdul de prova',
        learningResults: [
          {
            id: 1,
            number: 1,
            allCriteriaEligible: false,
            evaluationCriterias: [
              { id: 11, code: 'a' },
              { id: 12, code: 'b' },
              { id: 13, code: 'c' }
            ]
          },
          {
            id: 2,
            number: 2,
            allCriteriaEligible: false,
            evaluationCriterias: [
              { id: 21, code: 'b' },
              { id: 22, code: 'c' }
            ]
          }
        ]
      }
    ]
    wrapper.vm.selectedEvaluationCriteriaIds = new Set([11, 12, 13, 21, 22])
    wrapper.vm.currentStep = 2
    await wrapper.vm.$nextTick()

    const summary = wrapper.get('.card-body').text()

    expect(summary).toContain('1a,b,c')
    expect(summary).toContain('2b,c')
  })

  it('shows grouped criteria instead of repeating the complete learning result', async () => {
    const wrapper = mountComponent()
    wrapper.vm.modules = [
      {
        moduleCode: 'M01',
        moduleName: 'Mòdul de prova',
        learningResults: [
          {
            id: 2,
            number: 2,
            allCriteriaEligible: true,
            evaluationCriterias: [
              { id: 21, code: 'a' },
              { id: 22, code: 'b' }
            ]
          }
        ]
      }
    ]
    wrapper.vm.selectedLearningResultIds = new Set([2])
    wrapper.vm.selectedEvaluationCriteriaIds = new Set([21, 22])
    wrapper.vm.currentStep = 2
    await wrapper.vm.$nextTick()

    const summary = wrapper.get('.card-body').text()

    expect(summary).toContain('2a,b')
    expect(summary).not.toContain('2, 2a,b')
  })

  it('preloads the development received for selected learning results when editing', async () => {
    const plan = {
      id: 10,
      name: 'Pla de prova',
      turn: 'presential',
      courseLevel: 1,
      moduleHours: [],
      periods: []
    }
    api.getIndividualTrainingPlanAvailableItems.mockResolvedValue({
      data: [
        {
          moduleCode: 'M01',
          moduleName: 'Mòdul de prova',
          learningResults: [
            {
              id: 1,
              number: 1,
              selected: true,
              development: 'compartido',
              evaluationCriterias: []
            }
          ]
        }
      ]
    })
    api.getIndividualTrainingPlan.mockResolvedValue({ data: plan })

    const wrapper = mountComponent()
    await wrapper.vm.openEditModal(plan)

    expect(wrapper.vm.learningResultDevelopments).toEqual({ 1: 'compartido' })
  })

  it('removes a learning result development when its learning result is deselected', () => {
    const wrapper = mountComponent()
    wrapper.vm.selectedLearningResultIds = new Set([1])
    wrapper.vm.learningResultDevelopments = { 1: 'empresa' }

    wrapper.vm.toggleLearningResult({ id: 1, evaluationCriterias: [] })

    expect(wrapper.vm.learningResultDevelopments).toEqual({})
  })

  it('removes all selections and data for a module', () => {
    const wrapper = mountComponent()
    wrapper.vm.modules = [
      {
        moduleCode: 'M01',
        learningResults: [{ id: 1, evaluationCriterias: [{ id: 11 }] }]
      },
      {
        moduleCode: 'M02',
        learningResults: [{ id: 2, evaluationCriterias: [{ id: 21 }] }]
      }
    ]
    wrapper.vm.activeModuleCode = 'M01'
    wrapper.vm.selectedLearningResultIds = new Set([1, 2])
    wrapper.vm.selectedEvaluationCriteriaIds = new Set([11, 21])
    wrapper.vm.learningResultDevelopments = { 1: 'empresa', 2: 'compartido' }
    wrapper.vm.form.moduleHours = { M01: 10, M02: 20 }
    wrapper.vm.form.moduleActivities = { M01: 'Activitat 1', M02: 'Activitat 2' }

    wrapper.vm.removeModuleSelection('M01')

    expect(wrapper.vm.activeModuleCode).toBe('')
    expect(wrapper.vm.selectedLearningResultIds).toEqual(new Set([2]))
    expect(wrapper.vm.selectedEvaluationCriteriaIds).toEqual(new Set([21]))
    expect(wrapper.vm.learningResultDevelopments).toEqual({ 2: 'compartido' })
    expect(wrapper.vm.form.moduleHours).toEqual({ M02: 20 })
    expect(wrapper.vm.form.moduleActivities).toEqual({ M02: 'Activitat 2' })
  })

  it('sends only non-inferred learning result developments', async () => {
    const store = useDataStore()
    store.createIndividualTrainingPlan = vi.fn().mockResolvedValue(true)

    const wrapper = mountComponent()
    wrapper.vm.modules = [
      {
        moduleCode: 'M01',
        moduleName: 'Mòdul de prova',
        learningResults: [{ id: 1, number: 1, allCriteriaEligible: false, evaluationCriterias: [] }]
      }
    ]
    wrapper.vm.selectedLearningResultIds = new Set([1])
    wrapper.vm.learningResultDevelopments = { 1: 'compartido' }
    wrapper.vm.form.name = 'Pla de prova'
    wrapper.vm.form.turn = 'presential'
    wrapper.vm.form.courseLevel = 1
    wrapper.vm.form.moduleHours = { M01: 10 }
    wrapper.vm.form.periods = [
      {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        hours: 10,
        company: 'Empresa de programació'
      }
    ]

    await wrapper.vm.handleSavePlan()

    expect(store.createIndividualTrainingPlan).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ learningResultDevelopments: { 1: 'compartido' } })
    )
  })

  it('updates the development label when its selector changes', async () => {
    const wrapper = mountComponent()
    wrapper.vm.modules = [
      {
        moduleCode: 'M01',
        moduleName: 'Mòdul de prova',
        hasSyllabus: true,
        learningResults: [
          {
            id: 1,
            number: 1,
            descriptor: 'RA de prova',
            allCriteriaEligible: true,
            coverage: 'complete',
            evaluationCriterias: []
          }
        ]
      }
    ]
    wrapper.vm.selectedLearningResultIds = new Set([1])
    wrapper.vm.learningResultDevelopments = { 1: 'inferido' }
    wrapper.vm.form.courseLevel = 1
    wrapper.vm.activeModuleCode = 'M01'
    useDataStore().cycle = { availableTurns: [], modules: [{ code: 'M01', courseLevel: 1 }] }
    wrapper.vm.currentStep = 2
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.badge').some((badge) => badge.text().includes('Solo Empresa'))).toBe(true)

    await wrapper.get('#lr-development-1').setValue('compartido')

    expect(wrapper.findAll('.badge').some((badge) => badge.text().includes('Empresa + Centre'))).toBe(true)
  })

  it('shows modules from both courses for half-presential second-course plans', async () => {
    const wrapper = mountComponent()
    wrapper.vm.modules = [
      {
        moduleCode: 'M01',
        moduleName: 'Mòdul de 1r',
        courseLevel: 1,
        learningResults: [{ id: 1, number: 1, evaluationCriterias: [] }]
      },
      {
        moduleCode: 'M02',
        moduleName: 'Mòdul de 2n',
        courseLevel: 2,
        learningResults: [{ id: 2, number: 2, evaluationCriterias: [] }]
      }
    ]
    wrapper.vm.form.turn = 'half-presential'
    wrapper.vm.form.courseLevel = 2
    wrapper.vm.currentStep = 2
    await wrapper.vm.$nextTick()

    expect(wrapper.find('option[value="M01"]').exists()).toBe(true)
    expect(wrapper.find('option[value="M02"]').exists()).toBe(true)

    wrapper.vm.form.turn = 'presential'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('option[value="M01"]').exists()).toBe(false)
    expect(wrapper.find('option[value="M02"]').exists()).toBe(true)
  })

  it('removes first-course selections when changing a second-course plan to presential', async () => {
    const store = useDataStore()
    store.addMessage = vi.fn()
    const availableItems = [
      {
        moduleCode: 'M01',
        moduleName: 'Mòdul de 1r',
        courseLevel: 1,
        learningResults: [{ id: 1, number: 1, evaluationCriterias: [{ id: 11, code: 'a' }] }]
      },
      {
        moduleCode: 'M02',
        moduleName: 'Mòdul de 2n',
        courseLevel: 2,
        learningResults: [{ id: 2, number: 2, evaluationCriterias: [{ id: 21, code: 'a' }] }]
      }
    ]
    api.getIndividualTrainingPlanAvailableItems.mockResolvedValue({ data: availableItems })

    const wrapper = mountComponent()
    wrapper.vm.form.courseLevel = 2
    wrapper.vm.form.turn = 'half-presential'
    await wrapper.vm.handleTurnChange()
    wrapper.vm.selectedLearningResultIds = new Set([1, 2])
    wrapper.vm.selectedEvaluationCriteriaIds = new Set([11, 21])
    wrapper.vm.learningResultDevelopments = { 1: 'empresa', 2: 'compartido' }
    wrapper.vm.form.moduleHours = { M01: 10, M02: 20 }
    wrapper.vm.form.moduleActivities = { M01: 'Activitat 1r', M02: 'Activitat 2n' }

    wrapper.vm.form.turn = 'presential'
    await wrapper.vm.handleTurnChange()

    expect(wrapper.vm.selectedLearningResultIds).toEqual(new Set([2]))
    expect(wrapper.vm.selectedEvaluationCriteriaIds).toEqual(new Set([21]))
    expect(wrapper.vm.learningResultDevelopments).toEqual({ 2: 'compartido' })
    expect(wrapper.vm.form.moduleHours).toEqual({ M02: 20 })
    expect(wrapper.vm.form.moduleActivities).toEqual({ M02: 'Activitat 2n' })
    expect(store.addMessage).toHaveBeenCalledWith(
      'info',
      "S'han retirat elements de 1r perquè no són compatibles amb un pla presencial de 2n"
    )
  })

  it('keeps selections when changing from presential to half-presential', async () => {
    const availableItems = [
      {
        moduleCode: 'M01',
        moduleName: 'Mòdul de 1r',
        courseLevel: 1,
        learningResults: [{ id: 1, number: 1, evaluationCriterias: [{ id: 11, code: 'a' }] }]
      },
      {
        moduleCode: 'M02',
        moduleName: 'Mòdul de 2n',
        courseLevel: 2,
        learningResults: [{ id: 2, number: 2, evaluationCriterias: [{ id: 21, code: 'a' }] }]
      }
    ]
    api.getIndividualTrainingPlanAvailableItems.mockResolvedValue({ data: availableItems })

    const wrapper = mountComponent()
    wrapper.vm.form.courseLevel = 2
    wrapper.vm.form.turn = 'presential'
    await wrapper.vm.handleTurnChange()
    wrapper.vm.selectedLearningResultIds = new Set([1, 2])
    wrapper.vm.selectedEvaluationCriteriaIds = new Set([11, 21])
    wrapper.vm.learningResultDevelopments = { 1: 'empresa', 2: 'compartido' }
    wrapper.vm.form.moduleHours = { M01: 10, M02: 20 }
    wrapper.vm.form.moduleActivities = { M01: 'Activitat 1r', M02: 'Activitat 2n' }

    wrapper.vm.form.turn = 'half-presential'
    await wrapper.vm.handleTurnChange()

    expect(wrapper.vm.selectedLearningResultIds).toEqual(new Set([1, 2]))
    expect(wrapper.vm.selectedEvaluationCriteriaIds).toEqual(new Set([11, 21]))
    expect(wrapper.vm.learningResultDevelopments).toEqual({ 1: 'empresa', 2: 'compartido' })
    expect(wrapper.vm.form.moduleHours).toEqual({ M01: 10, M02: 20 })
    expect(wrapper.vm.form.moduleActivities).toEqual({ M01: 'Activitat 1r', M02: 'Activitat 2n' })
  })
})
