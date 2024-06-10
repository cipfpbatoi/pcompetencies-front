import { defineStore } from 'pinia'
import { api } from '../repositories/api.js'

const DELMSG_TIMEOUT = 8000
let id = 1

export const useDataStore = defineStore('data', {
  state() {
    return {
      user: {},
      messages: [],
      syllabus: {},
      module: {},
      cycle: {},
      activitiesData: {
        assessmentTool: [],
        markingTool: []
      },
      transversalObjectives: []
    }
  },
  getters: {
    getLearningResultById: (state) => (learningResultId) =>
      state.module.learningResults.find((item) => item.id == learningResultId) || {},

    getEvalCriteriaByLearningResult: (state) => (learningResultId) =>
      state.evaluationCriteria.filter((item) => item.learning_result_id == learningResultId)
  },
  actions: {
    async loginUser(credentials) {
      try {
        const response = await api.loginCheck(credentials)
        localStorage.token = response.data.token
        this.addMessage('success', 'Usuario logueado')
        await this.loadData()
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
      }
    },
    logoutUser() {
      localStorage.removeItem('token')
      localStorage.removeItem('data')
      localStorage.removeItem('redirect')
      this.user = {}
      this.syllabus = {}
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
      if (type === 'success' || type === 'error') {
        setTimeout(() => this.delMessage(id), DELMSG_TIMEOUT)
      }
    },
    delMessage(id) {
      const index = this.messages.findIndex((item) => item.id === id)
      this.messages.splice(index, 1)
    },
    async loadData() {
      if (localStorage.token) {
        this.user.token = localStorage.token
        try {
          const [respActAsmt, respActMark, respTransversals, respUser] = await Promise.all([
            api.getAsessmentTool(),
            api.getMarkingTool(),
            api.getTrasversalObjectives(),
            api.userCurrent()
          ])
          this.activitiesData = {
            assessmentTool: respActAsmt.data,
            markingTool: respActMark.data
          }
          this.transversalObjectives = respTransversals.data
          this.user.info = respUser.data
        } catch (error) {
          this.addMessage('error', error)
        }
        if (localStorage.data) {
          const data = JSON.parse(localStorage.data)
          this.syllabus = { id: data.syllabusId }
          try {
            const [respCycle, respMod, respSyl] = await Promise.all([
              api.getCycleById(data.cycleId),
              api.getModuleByCode(data.moduleCode),
              api.getSyllabusById(data.syllabusId)
            ])
            this.cycle = respCycle.data
            this.module = respMod.data
            this.syllabus = respSyl.data
          } catch (error) {
            this.addMessage('error', error)
          }
        }
      }
    },
    async fetchCycle(cycleId) {
      try {
        const response = await api.getCycleById(cycleId)
        this.cycle = response.data
      } catch (error) {
        this.cycle = {}
        this.addMessage('error', error)
      }
    },
    async fetchData(moduleCode, syllabusId) {
      try {
        const [respMod, respSyl] = await Promise.all([
          api.getModuleByCode(moduleCode),
          api.getSyllabusById(syllabusId)
        ])
        this.module = respMod.data
        this.syllabus = respSyl.data
        localStorage.data = JSON.stringify({
          cycleId: this.cycle.id,
          moduleCode: this.module.code,
          syllabusId: this.syllabus.id
        })
      } catch (error) {
        this.module = {}
        this.module = {}
        localStorage.removeItem('data')
        this.addMessage('error', error)
      }
    },
    async saveSyllabusGroupContext(id, data) {
      try {
        const response = await api.createSyllabusGroupContext(id, data)
        this.syllabus.groupContext = response.data.groupContext
        this.addMessage('success', 'Contextualització guardada')
        return 'ok'
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
    },
    async evaluateImprovement(id, data) {
      try {
        const response = await api.evaluateImprovement(id, data)
        this.syllabus.currentImprovementProposal = response.data.improvementProposal
        this.addMessage('success', 'Avaluació de propostes guardada')
        return 'ok'
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
    },
    async saveLearningSituation(ls) {
      if (!ls.id) {
        // Estamos creando una nueva
        // const maxPosition = this.syllabus.learningSituations.reduce(
        //   (max, item) => Math.max(max, item.position),
        //   0
        // )
        // ls.position = maxPosition + 1
        try {
          const response = await api.createLearningSituation(this.syllabus.id, ls)
          this.syllabus.learningSituations.push(response.data)
        } catch (error) {
          if (error.response?.status != 422) {
            this.addMessage('error', error)
          }
          return error
        }
      } else {
        // Estamos modificando una existente
        try {
          const id = ls.id
          delete ls.id
          const response = await api.replaceLearningSituation(id, ls)
          this.syllabus.learningSituations.splice(
            this.syllabus.learningSituations.findIndex((item) => item.id === id),
            1,
            response.data
          )
        } catch (error) {
          if (error.response?.status != 422) {
            this.addMessage('error', error)
          }
          return error
        }
      }
      this.addMessage('success', "Situació d'aprenentatge guardada")
      return 'ok'
    },
    async deleteLearningSituation(lsId) {
      try {
        await api.deleteLearningSituation(lsId)
        this.syllabus.learningSituations.splice(
          this.syllabus.learningSituations.findIndex((item) => item.id === lsId),
          1
        )
      } catch (error) {
        this.addMessage('error', error)
        return
      }
      this.addMessage('success', "Situació d'aprenentatge eliminada")
    },
    async saveLearningSituationObjectives(lsId, data) {
      try {
        const response = await api.saveLearningSituationObjectives(lsId, data)
        this.syllabus.learningSituations.splice(
          this.syllabus.learningSituations.findIndex((item) => item.id === lsId),
          1,
          response.data
        )
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
      this.addMessage('success', 'Objectius guardats')
      return 'ok'
    },
    async saveLearningSituationPriorKnowledge(lsId, data) {
      try {
        const response = await api.saveLearningSituationPriorKnowledge(lsId, data)
        this.syllabus.learningSituations.splice(
          this.syllabus.learningSituations.findIndex((item) => item.id === lsId),
          1,
          response.data
        )
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
      this.addMessage('success', 'Coneixements previs guardats')
      return 'ok'
    },
    async saveLearningSituationCompetences(lsId, data) {
      try {
        const response = await api.saveLearningSituationCompetences(lsId, data)
        this.syllabus.learningSituations.splice(
          this.syllabus.learningSituations.findIndex((item) => item.id === lsId),
          1,
          response.data
        )
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
      this.addMessage('success', 'Competències guardades')
      return 'ok'
    }

  }
})
