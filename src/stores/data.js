import { defineStore } from 'pinia'
import { api } from '../repositories/api.js'

const DELMSG_TIMEOUT = 3000
let id = 1

export const useDataStore = defineStore('data', {
  state() {
    return {
      currentStep: 0,
      messages: [],
      syllabus: {},
      module: {},
    }
  },
  getters: {
    getLearningResultById: (state) => (learningResultId) =>
    state.module.learningResults.find((item) => item.id == learningResultId) || {},

    getEvalCriteriaByLearningResult: (state) => (learningResultId) =>
      state.evaluationCriteria.filter((item) => item.learning_result_id == learningResultId),
  },
  actions: {
    async loginUser(credentials) {
      try {
        const response = await api.loginCheck(credentials)
        localStorage.token = response.data.token
        this.addMessage('success', 'Usuario logueado')
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
      }
    },
    addMessage(type, message) {
      let text = ''
      if (message.response) {
        if (message.response.data?.title) {
          text =
            message.response.data.title +
            ` (${message.response.data.status})` +
            message.response.data.detail
        } else {
          // token expired
          text = message.name + ` (${message.response.data.code}): ` + message.response.data.message
        }
      } else {
        text = message
      }
      const newMessage = { id: ++id, text }
      switch (type) {
        case 'error':
          newMessage.bgColor = 'bg-danger'
          newMessage.title = 'Error'
          break
        case 'success':
          newMessage.bgColor = 'bg-success'
          newMessage.title = 'Hecho!'
          break
        case 'info':
          newMessage.bgColor = 'bg-primary'
          newMessage.title = 'Info'
          break
        default:
          break
      }
      newMessage.time = new Date().toLocaleTimeString()
      this.messages.push(newMessage)
      if (type === 'success') {
        setTimeout(() => this.delMessage(id), DELMSG_TIMEOUT)
      }
    },
    delMessage(id) {
      const index = this.messages.findIndex((item) => item.id === id)
      this.messages.splice(index, 1)
    },
    loadData() {
      if (localStorage.module) {
        this.module = JSON.parse(localStorage.module)
      }
      if (localStorage.syllabus) {
        this.syllabus = JSON.parse(localStorage.syllabus)
      }
    },
    async fetchModule(moduleCode) {
      try {
        const respMod = await api.getModuleByCode(moduleCode)
        this.module = respMod.data
        localStorage.module = JSON.stringify(this.module)
      } catch (error) {
        this.module = {}
        localStorage.module = JSON.stringify({})
        this.addMessage('error', error)
      }
    },
    async fetchSyllabus(syllabusId) {
      try {
        const respSyl = await api.getSyllabusById(syllabusId)
        this.syllabus = respSyl.data
        localStorage.syllabus = JSON.stringify(this.syllabus)
      } catch (error) {
        this.syllabus = {}
        localStorage.syllabus = JSON.stringify({})
        this.addMessage('error', error)
      }
    },
    async evaluateImprovement(data) {
      try {
        await api.evaluateImprovement(this.syllabus.improvementProposal.id, data)
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
      }

    },
    async saveLearningSituation(ls) {
      if (!ls.id) {
        // Estamos creando una nueva
        const maxPosition = this.syllabus.learningSituations.reduce(
          (max, item) => Math.max(max, item.position),
          0
        )
        ls.position = maxPosition + 1

        try {
          await api.createLearningSituation(this.syllabus.id, ls)
        } catch (error) {
          this.addMessage('error', error)
          return false
        }
      } else {
        // Estamos modificando una existente
        try {
          const id = ls.id
          delete ls.id
          await api.replaceLearningSituation(id, ls)
        } catch (error) {
          this.addMessage('error', error)
          return false
        }
      }
      this.addMessage('success', 'Unitat guardada')
      this.fetchSyllabus(this.syllabus.id)
      return true
    },
    async deleteLearningSituation(lsId) {
      try {
        await api.deleteLearningSituation(lsId)
        this.syllabus.learningSituations.splice(
          this.syllabus.learningSituations.findIndex((item) => item.id === lsId),
          1
        )
        localStorage.syllabus = JSON.stringify(this.syllabus)
      } catch (error) {
        this.addMessage('error', error)
        return
      }
      this.addMessage('success', 'Unitat eliminada')
    }
  }
})
