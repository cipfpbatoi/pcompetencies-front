import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SaoExportAccessModal from '../SaoExportAccessModal.vue'

const ModalStub = {
  props: ['saveDisabled'],
  emits: ['save'],
  template:
    '<div><slot /><button data-testid="save" :disabled="saveDisabled" @click="$emit(\'save\')">Desa</button></div>',
  methods: {
    show() {},
    hide() {}
  }
}

describe('SaoExportAccessModal', () => {
  it('collects credentials without keeping the password after submission', async () => {
    const wrapper = mount(SaoExportAccessModal, {
      props: { planName: 'Pla de prova' },
      global: { stubs: { ModalComponent: ModalStub } }
    })

    await wrapper.get('#saoUsername').setValue('professor')
    await wrapper.get('#saoPassword').setValue('secret')
    expect(wrapper.find('#saoForcedExport').exists()).toBe(false)
    await wrapper.get('[data-testid="save"]').trigger('click')

    expect(wrapper.emitted('submit-credentials')).toEqual([
      [{ username: 'professor', password: 'secret', force: false }]
    ])
    expect(wrapper.get('#saoPassword').element.value).toBe('')
  })

  it('asks for a six digit code only when ITACA requires it', async () => {
    const wrapper = mount(SaoExportAccessModal, {
      props: {
        planName: 'Pla de prova',
        exportState: { status: 'exporting', progressStage: 'otp_required' }
      },
      global: { stubs: { ModalComponent: ModalStub } }
    })

    await wrapper.get('#saoOtp').setValue('123456')
    await wrapper.get('[data-testid="save"]').trigger('click')

    expect(wrapper.emitted('submit-otp')).toEqual([['123456']])
  })

  it('keeps a partially typed code when polling reopens the modal', async () => {
    const wrapper = mount(SaoExportAccessModal, {
      props: {
        planName: 'Pla de prova',
        exportState: { status: 'exporting', progressStage: 'otp_required' }
      },
      global: { stubs: { ModalComponent: ModalStub } }
    })

    await wrapper.get('#saoOtp').setValue('1234')
    wrapper.vm.show(true)

    expect(wrapper.get('#saoOtp').element.value).toBe('1234')
  })

  it('allows a new synchronization after a previous export has finished', async () => {
    const wrapper = mount(SaoExportAccessModal, {
      props: {
        planName: 'Pla de prova',
        exportState: { status: 'failed', progressStage: null }
      },
      global: { stubs: { ModalComponent: ModalStub } }
    })

    expect(wrapper.find('#saoUsername').exists()).toBe(true)
    expect(wrapper.find('#saoPassword').exists()).toBe(true)
    expect(wrapper.find('#saoOtp').exists()).toBe(false)
  })

  it('allows choosing a forced synchronization only when reexporting', async () => {
    const wrapper = mount(SaoExportAccessModal, {
      props: {
        planName: 'Pla de prova',
        allowForce: true
      },
      global: { stubs: { ModalComponent: ModalStub } }
    })

    await wrapper.get('#saoForcedExport').setValue(true)
    expect(wrapper.get('#saoForcedExport').element.checked).toBe(true)
    await wrapper.get('#saoUsername').setValue('professor')
    await wrapper.get('#saoPassword').setValue('secret')
    await wrapper.get('[data-testid="save"]').trigger('click')

    expect(wrapper.emitted('submit-credentials')).toEqual([
      [{ username: 'professor', password: 'secret', force: true }]
    ])
  })
})
