import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '@/stores/data'
import PccModuleManager from '@/components/PccModuleManager.vue'
import PccModuleOrganization from '@/components/PccModuleOrganization.vue'
import ModulesPCC from '@/views/pcc/ModulesPCC.vue'

const getPcc = (modules, availableTurns = ['presential', 'half-presential']) => ({
  id: 99,
  cycle: { id: 10, availableTurns },
  modules,
  moduleOrganizations: []
})

const configureStore = (pcc) => {
  const store = useDataStore()
  store.$patch({
    pcc,
    cycle: { id: 10, loadedTurn: 'presential', modules: [] }
  })
  store.addMessage = vi.fn()
  store.savePCCModuleOrganization = vi.fn().mockResolvedValue(true)
  return store
}

describe('PCC optional modules', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('groups CVOP modules and counts only the first one per course', () => {
    configureStore(
      getPcc([
        { code: 'M01', name: 'Ordinari', courseLevel: 1, numberOfHours: 100 },
        { code: 'CVOP01', name: 'Optativa A', courseLevel: 1, numberOfHours: 50, weekHours: 3 },
        { code: 'CVOP02', name: 'Optativa B', courseLevel: 1, numberOfHours: 60, weekHours: 4 },
        { code: 'M02', name: 'Ordinari segon', courseLevel: 2, numberOfHours: 80 }
      ])
    )

    const wrapper = mount(PccModuleManager, { props: { pccId: 99 }, global: { stubs: { Teleport: true } } })

    expect(wrapper.text()).toContain('Total hores afegides: 150 h')
    expect(wrapper.text()).toContain('Hores totals mòduls afegits: 230')
    expect(wrapper.findAll('.optional-modules')).toHaveLength(1)
    expect(wrapper.find('.optional-modules').text()).toContain('Mòduls optatius')
    expect(wrapper.find('.optional-modules').text()).toContain('Els mòduls optatius han de tenir les mateixes hores')
  })

  it('shows the optional turn restriction in the module context list', () => {
    const pcc = getPcc([
      { code: 'CVOP01', name: 'Optativa', courseLevel: 1, numberOfHours: 50, weekHours: 3 }
    ])
    pcc.moduleOrganizations = [{ module: { code: 'CVOP01' }, optionalTurns: ['presential'] }]
    configureStore(pcc)

    const wrapper = mount(PccModuleManager, {
      props: { pccId: 99 },
      global: { stubs: { Teleport: true } }
    })

    expect(wrapper.find('.optional-modules').text()).toContain('Només Presencial')
  })

  it('sends the selected optional turn for a CVOP module', async () => {
    const store = configureStore(
      getPcc([
        {
          code: 'CVOP01',
          name: 'Optativa',
          courseLevel: 1,
          numberOfHours: 50,
          weekHours: 3
        }
      ])
    )
    const wrapper = mount(PccModuleOrganization, {
      props: { pccId: 99 },
      global: { stubs: { Teleport: true } }
    })

    await wrapper.find('.btn-primary').trigger('click')
    expect(wrapper.text()).toContain("Si no s'estableix restricció")
    await wrapper.find('#optional-turn-half-presential').setValue()
    wrapper.vm.form.distribution = '3'
    wrapper.vm.form.classroomHours = 3
    wrapper.vm.form.labHours = 0
    await wrapper.find('.modal-footer .btn-primary').trigger('click')
    await flushPromises()

    expect(store.savePCCModuleOrganization).toHaveBeenCalledWith(
      99,
      expect.objectContaining({
        moduleCode: 'CVOP01',
        optionalTurns: ['half-presential']
      })
    )
  })

  it('hides the selector and sends no restriction when the cycle has one turn', async () => {
    const store = configureStore(
      getPcc(
        [
          {
            code: 'CVOP01',
            name: 'Optativa',
            courseLevel: 1,
            numberOfHours: 50,
            weekHours: 3
          }
        ],
        ['presential']
      )
    )
    const wrapper = mount(PccModuleOrganization, {
      props: { pccId: 99 },
      global: { stubs: { Teleport: true } }
    })

    await wrapper.find('.btn-primary').trigger('click')
    expect(wrapper.find('#optional-turn-all').exists()).toBe(false)

    wrapper.vm.form.distribution = '3'
    wrapper.vm.form.classroomHours = 3
    wrapper.vm.form.labHours = 0
    await wrapper.find('.modal-footer .btn-primary').trigger('click')
    await flushPromises()

    expect(store.savePCCModuleOrganization).toHaveBeenCalledWith(
      99,
      expect.objectContaining({ optionalTurns: [] })
    )
  })

  it('loads the saved optional turn when editing an organization', async () => {
    const pcc = getPcc([
      {
        code: 'CVOP01',
        name: 'Optativa',
        courseLevel: 1,
        numberOfHours: 50,
        weekHours: 3
      }
    ])
    pcc.moduleOrganizations = [
      {
        module: { code: 'CVOP01' },
        distribution: '3',
        classroomHours: 3,
        labHours: 0,
        language: 'ca-ES',
        optionalTurns: ['presential']
      }
    ]
    configureStore(pcc)
    const wrapper = mount(PccModuleOrganization, {
      props: { pccId: 99 },
      global: { stubs: { Teleport: true } }
    })

    expect(wrapper.text()).toContain('Només Presencial')
    await wrapper.find('.btn-outline-primary').trigger('click')

    expect(wrapper.find('#optional-turn-presential').element.checked).toBe(true)
  })

  it('warns when an optional module restriction leaves a turn below the cycle hours', () => {
    const pcc = getPcc([
      { code: 'M01', name: 'Ordinari', courseLevel: 1, numberOfHours: 100 },
      { code: 'CVOP01', name: 'Optativa', courseLevel: 1, numberOfHours: 50 }
    ])
    pcc.cycle.hours = 150
    pcc.moduleOrganizations = [{ module: { code: 'CVOP01' }, optionalTurns: ['presential'] }]
    configureStore(pcc)

    const wrapper = mount(ModulesPCC, {
      global: {
        stubs: {
          AppBreadcrumb: true,
          PccModuleOrganization: true,
          Teleport: true
        }
      }
    })

    expect(wrapper.text()).toContain('Presencial')
    expect(wrapper.text()).toContain('150 / 150 h')
    expect(wrapper.text()).toContain('Semi-presencial')
    expect(wrapper.text()).toContain('100 / 150 h')
    expect(wrapper.text()).toContain("Cada torn ha d'oferir les 150 hores anuals del cicle")
  })

  it('does not warn when every turn reaches the cycle hours', () => {
    const pcc = getPcc([
      { code: 'M01', name: 'Ordinari', courseLevel: 1, numberOfHours: 100 },
      { code: 'CVOP01', name: 'Optativa', courseLevel: 1, numberOfHours: 50 }
    ])
    pcc.cycle.hours = 150
    pcc.moduleOrganizations = [{ module: { code: 'CVOP01' }, optionalTurns: [] }]
    configureStore(pcc)

    const wrapper = mount(ModulesPCC, {
      global: {
        stubs: {
          AppBreadcrumb: true,
          PccModuleOrganization: true,
          Teleport: true
        }
      }
    })

    expect(wrapper.text()).toContain('150 / 150 h')
    expect(wrapper.text()).not.toContain("Cada torn ha d'oferir")
  })
})
