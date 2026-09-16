import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from '@/stores/data'
import PccAssessmentTools from '@/components/PccAssessmentTools.vue'

const piTool = {
  id: 12,
  name: 'Projecte intermodular',
  code: 'PI',
  minPercentage: 0
}

const getPcc = () => ({
  id: 999,
  cycle: {
    id: 77,
    availableTurns: ['presential']
  },
  modules: [
    { code: 'PI1', name: 'Projecte de primer', courseLevel: 1, proyect: true },
    { code: 'M01', name: 'Mòdul primer A', courseLevel: 1 },
    { code: 'M02', name: 'Mòdul primer B', courseLevel: 1 },
    { code: 'M03', name: 'Mòdul segon', courseLevel: 2 }
  ]
})

const mountComponent = () => {
  return mount(PccAssessmentTools, {
    props: { pccId: 999, cycleId: 77 },
    global: {
      stubs: { Teleport: true }
    }
  })
}

const configureStore = (agreedTools = []) => {
  const store = useDataStore()
  store.$patch({ pcc: getPcc() })
  store.loadCycleAssessmentTools = vi
    .fn()
    .mockResolvedValue({ mandatory: [], nonMandatory: [piTool] })
  store.loadPCCAgreedAssessmentTools = vi.fn().mockResolvedValue(agreedTools)
  store.savePCCAgreedAssessmentTool = vi.fn().mockResolvedValue(true)
  store.addMessage = vi.fn()
  return store
}

const openPiModal = async (wrapper) => {
  await flushPromises()
  const toolButton = wrapper.find('.btn-primary').exists()
    ? wrapper.find('.btn-primary')
    : wrapper.find('.btn-outline-primary')
  await toolButton.trigger('click')
  await flushPromises()
}

const getModuleRow = (wrapper, code) =>
  wrapper.findAll('tbody tr').find((row) => row.text().includes(code))

describe('PccAssessmentTools', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('limits PI to non-project modules from project courses and hides all modules', async () => {
    configureStore()
    const wrapper = mountComponent()

    await openPiModal(wrapper)

    expect(wrapper.text()).not.toContain('Configuració anterior detectada.')
    expect(wrapper.text()).toContain('M01')
    expect(wrapper.text()).toContain('M02')
    expect(wrapper.text()).toContain('1r curs')
    expect(wrapper.text()).not.toContain('M03')
    expect(wrapper.find('#allModulesTools').exists()).toBe(false)
  })

  it('converts legacy PI applied to all modules into module-turn selections on save', async () => {
    const store = configureStore([{ assessmentTool: piTool, moduleTurnSelections: [] }])
    const wrapper = mountComponent()

    await openPiModal(wrapper)
    await wrapper.find('.modal-footer .btn-primary').trigger('click')
    await flushPromises()

    expect(store.savePCCAgreedAssessmentTool).toHaveBeenCalledWith(999, {
      assessmentToolId: 12,
      minPercentage: null,
      turns: ['presential'],
      moduleTurnSelections: [
        { moduleCode: 'M01', turn: 'presential' },
        { moduleCode: 'M02', turn: 'presential' }
      ]
    })
  })

  it('requires two different PI modules', async () => {
    configureStore()
    const wrapper = mountComponent()

    await openPiModal(wrapper)
    await getModuleRow(wrapper, 'M01').find('button').trigger('click')

    expect(wrapper.find('.modal-footer .btn-primary').attributes('disabled')).toBeDefined()

    await getModuleRow(wrapper, 'M02').find('button').trigger('click')

    expect(wrapper.find('.modal-footer .btn-primary').attributes('disabled')).toBeUndefined()
  })
})
