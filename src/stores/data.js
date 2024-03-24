import { defineStore } from 'pinia'
import APIService from '../repositories/api.js'

const DELMSG_TIMEOUT = 3000
let id = 1

export const useDataStore = defineStore('data', {
  state() {
    return {
      apiClient: null,
      user: {},
      messages: [],
      cicles: [],
      modules: [],
      currentModuleId: '',
      learningResults: [],
      evaluationCriteria: [],
      contentsBlocks: [],
      programming: {},
      workUnits: []
    }
  },
  getters: {
    getEvalCriteriaByLearningResult: (state) => (learningResultId) =>
      state.evaluationCriteria.filter((item) => item.learning_result_id == learningResultId),
    currentModule: (state) =>
      state.modules.find((item) => item.code === state.currentModuleId) || {}
  },
  actions: {
    async arregla() {
      const EC = await this.apiClient.get('/cicles')
      EC.forEach((crit) =>
        this.apiClient.arregla({
          id: crit.id,
          short_name: crit.complete_name,
          complete_name: crit.royal_decree_title,
          royal_decree_title: crit.royal_decree_title_new,
          royal_decree_title_new: crit.description,
          description: crit.department_id,
          department_id: crit.KEY
        })
      )
    },
    loadUser() {
      if (localStorage.user) {
        this.user = JSON.parse(localStorage.user)
      }
      this.apiClient = new APIService(this.user.token)
    },
    async loginUser(credentials) {
      this.apiClient = new APIService()
      try {
        const user = await this.apiClient.login(credentials)
        this.user = user
        localStorage.user = JSON.stringify(user)
        this.addMessage('success', 'Usuario logueado')
        this.apiClient = new APIService(this.user.token)
      } catch (error) {
        this.user = {}
        this.addMessage('error', error)
        return
      }
      if (!this.cicles.length) {
        this.loadData()
      }
    },
    logoutUser() {
      localStorage.removeItem('user')
      this.user = {}
    },
    addMessage(type, message) {
      let text = ''
      if (message.response) {
        if (message.response.data?.title) {
          text = message.response.data.title +
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
    async loadData() {
      try {
        this.cicles = await this.apiClient.getCicles()
        this.addMessage('success', 'Datos cargados')
      } catch (error) {
        this.addMessage('error', error)
      } finally {
        this.currentModuleId = ''
        this.modules = []
        this.learningResults = []
        this.evaluationCriteria = []
        this.contentsBlocks = []
        this.programming = {}
        this.workUnits = []
      }
    },
    async loadModules(cicleId) {
      try {
        const response = await this.apiClient.getModules(cicleId)
        this.modules = response.modules
      } catch (error) {
        this.modules = []
        this.addMessage('error', error)
      } finally {
        this.currentModuleId = ''
        this.learningResults = []
        this.evaluationCriteria = []
        this.contentsBlocks = []
        this.programming = {}
        this.workUnits = []
      }
    },
    async loadModuleInfo(cycleId, moduleId) {
      try {
        this.currentModuleId = moduleId
        this.learningResults = await this.apiClient.getLearningResults(moduleId)
        this.evaluationCriteria = await this.apiClient.getEvaluationCriteria(
          this.learningResults.map((lr) => lr.id)
        )
        this.contentsBlocks = await this.apiClient.getContentsBlocks(moduleId)
        const programming = await this.apiClient.getProgramming(cycleId, moduleId)
        this.programming = programming[0]
        if (this.programming.id) {
          this.workUnits = await this.apiClient.getWorkUnits(this.programming.id)
        } else {
          this.workUnits = []
        }
      } catch (error) {
        this.currentModuleId = ''
        this.learningResults = []
        this.evaluationCriteria = []
        this.contentsBlocks = []
        this.programming = {}
        this.workUnits = []
        this.addMessage('error', error)
      }
    },
    async getProgrammings(cycleId, moduleId) {
      try {
        return await this.apiClient.getProgramming(cycleId, moduleId)
      } catch (error) {
        this.addMessage('error', error)
        return []
      }
    },
    setProgramming(prog) {
      this.programming = prog
    },
    async addProgramming(cycleId, moduleId, turn) {
      try {
        this.programming = await this.apiClient.addProgramming(cycleId, moduleId, turn)
        this.addMessage('success', 'Programació creada')
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async saveWorkUnit(unit) {
      if (!unit.id) {
        const maxOrder = this.workUnits.reduce((max, item) => Number.max(max, item.order), 0)
        unit.order = maxOrder + 1
      }
      const newWorkUnit = await this.apiClient.saveWorkUnit(unit)
      if (unit.id) {
        this.workUnits.splice(
          this.workUnits.findIndex((item) => item.id === unit.id),
          1,
          newWorkUnit
        )
      } else {
        this.workUnits.push(newWorkUnit)
      }
      this.addMessage('success', 'Unitat guardada')
    },
    async delWorkUnit(unitId) {
      await this.apiClient.delWorkUnit(unitId)
      this.workUnits.splice(
        this.workUnits.findIndex((item) => item.id === unitId),
        1
      )
      this.addMessage('success', 'Unitat eliminada')
    }
  }
})
