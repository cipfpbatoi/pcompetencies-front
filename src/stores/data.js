import { defineStore } from 'pinia'
import { api } from '../repositories/api.js'

const DELMSG_TIMEOUT = 8000
let id = 1

export const useDataStore = defineStore('data', {
  state() {
    return {
      user: {},
      messages: [],
      pcc: { methodologicalPrinciplesContext: [] },
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
          text = ` (${message.response.data.code}): ` + message.response.data.message
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
    filterModules() {
      if (this.user.info && !this.user.info.roles.includes('ROLE_ADMIN')) {
        this.cycle.modules = this.cycle.modules.filter((item) =>
          item.departments.some((element) => element.id === this.user.info?.department.id)
        )
      }
    },
    setCycleAndModule(cycleId, moduleCode) {
      this.cicle = { id: cycleId }
      this.module = { code: moduleCode }
    },
    async loadCurrentUser() {
      try {
        const response = await api.userCurrent()
        this.user.info = response.data
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    async loadData() {
      if (localStorage.token) {
        this.user.token = localStorage.token
        if (localStorage.data) {
          const data = JSON.parse(localStorage.data)
          this.syllabus = { id: data.syllabusId }
          try {
            const [respPCC, respCycle, respMod, respSyl] = await Promise.all([
              api.getPCCByCycleId(data.cycleId),
              api.getCycleById(data.cycleId),
              api.getModuleByCode(data.moduleCode),
              api.getSyllabusById(data.syllabusId)
            ])
            this.pcc = respPCC.data
            this.cycle = respCycle.data
            this.filterModules()
            this.module = respMod.data
            this.syllabus = respSyl.data
          } catch (error) {
            this.addMessage('error', error)
          }
        }
        await this.loadCurrentUser()
        try {
          const [respActAsmt, respActMark, respTransversals] = await Promise.all([
            await api.getAsessmentTool(),
            api.getMarkingTool(),
            api.getTrasversalObjectives()
          ])
          this.activitiesData = {
            assessmentTool: respActAsmt.data,
            markingTool: respActMark.data
          }
          this.transversalObjectives = respTransversals.data
        } catch (error) {
          this.addMessage('error', error)
        }
      }
    },
    async fetchCycle(cycleId) {
      try {
        const response = await api.getCycleById(cycleId)
        this.cycle = response.data
        this.filterModules()
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
    async savePccOportunities(id, data) {
      try {
        const response = await api.createPccOportunities(id, data)
        this.pcc = response.data
        this.addMessage('success', 'Contextualització guardada')
        return 'ok'
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
    },
    async savePccEnvironment(id, data) {
      try {
        const response = await api.createPccEnvironment(id, data)
        this.pcc = response.data
        this.addMessage('success', 'Contextualització guardada')
        return 'ok'
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
    },
    async savePccSustainabilityCriteria(id, data) {
      try {
        const response = await api.savePccSustainabilityCriteria(id, data)
        this.pcc = response.data
        this.addMessage('success', 'Criteris de sostenibilitat guardats')
        return 'ok'
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
    },
    async savePccComplementaryCriteria(id, data) {
      try {
        const response = await api.savePccComplementaryCriteria(id, data)
        this.pcc = response.data
        this.addMessage('success', "Criteris d'activitats complementàries guardats")
        return 'ok'
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
    },
    async savePCCIntermodularGuide(pccId, data) {
      try {
        const response = await api.savePCCIntermodularGuide(pccId, data)
        this.pcc = response.data
        this.addMessage('success', 'Guia del projecte intermodular guardada')
        return 'ok'
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
    },
    async savePCCIntermodularOrientation(pccId, data) {
      try {
        const response = await api.savePCCIntermodularOrientation(pccId, data)
        this.pcc = response.data
        this.addMessage('success', 'Orientació guardada')
        return 'ok'
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
    },
    async deletePCCIntermodularOrientation(pccId, moduleCode, learningResultId) {
      try {
        const response = await api.deletePCCIntermodularOrientation(
          pccId,
          moduleCode,
          learningResultId
        )
        this.pcc = response.data
        this.addMessage('success', 'Orientació eliminada')
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
      }
    },
    async savePccMethodologicalPrinciple(id, data) {
      try {
        const response = await api.savePCCMethodologicalPrinciple(id, data)
        if (!this.pcc.methodologicalsPrinciplesContext) {
          this.pcc.methodologicalsPrinciplesContext = []
        }
        const responseMethodologicalPrincipleId =
          response.data?.methodologicalPrinciple?.id ||
          response.data?.methodologicalPrincipleId ||
          response.data?.id
        const index = this.pcc.methodologicalsPrinciplesContext.findIndex((item) => {
          const itemMethodologicalPrincipleId =
            item.methodologicalPrinciple?.id || item.methodologicalPrincipleId || item.id
          return itemMethodologicalPrincipleId === responseMethodologicalPrincipleId
        })
        if (index > -1) {
          // Editamos existente
          this.pcc.methodologicalsPrinciplesContext.splice(index, 1, response.data)
          this.addMessage('success', 'Principi metodològic actualitzat')
        } else {
          // Nueva
          this.pcc.methodologicalsPrinciplesContext.push(response.data)
          this.addMessage('success', 'Principi metodològic guardat')
        }
        return 'ok'
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
    },
    async deletePccMethodologicalPrinciple(id, data) {
      try {
        const index = this.pcc.methodologicalsPrinciplesContext.findIndex(
          (item) => item.methodologicalPrinciple.id === data.methodologicalPrincipleId
        )
        if (index > -1) {
          await api.deletePCCMethodologicalPrinciple(id, data.methodologicalPrincipleId)
          this.pcc.methodologicalsPrinciplesContext.splice(index, 1)
          this.addMessage('success', 'Principi metodològic eliminat')
        } else {
          // Nueva
          this.addMessage('error', `Principi metodològic ${data.id} no trobat`)
          return
        }
        return 'ok'
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
    },
    async addModuleToPCC(pccId, moduleCodes) {
      try {
        const response = await api.addPCCModules(pccId, moduleCodes)
        this.pcc = response.data
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
      }
    },
    async removeModuleFromPCC(pccId, moduleCode) {
      try {
        await api.removePCCModule(pccId, moduleCode)
        this.pcc.modules = this.pcc.modules.filter((m) => m.code !== moduleCode)
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
      }
    },
    async savePCCModuleOrganization(pccId, data) {
      try {
        const response = await api.createPCCModuleOrganization(pccId, data)
        const cycleId = this.pcc?.cycle?.id || this.cycle?.id
        if (cycleId) {
          const refreshed = await api.getPCCByCycleId(cycleId)
          this.pcc = refreshed.data
        } else {
          // Fallback si no hay ciclo disponible para refrescar
          const moduleInfo = this.pcc.modules?.find((m) => m.code === data.moduleCode)
          const organizationData = {
            ...response.data,
            module: moduleInfo || { code: data.moduleCode }
          }
          if (!this.pcc.moduleOrganizations) {
            this.pcc.moduleOrganizations = []
          }
          const index = this.pcc.moduleOrganizations.findIndex(
            (mo) => mo.module?.code === data.moduleCode
          )
          if (index > -1) {
            this.pcc.moduleOrganizations[index] = organizationData
          } else {
            this.pcc.moduleOrganizations.push(organizationData)
          }
        }
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
      }
    },
    async deletePCCModuleOrganization(pccId, moduleCode) {
      try {
        await api.deletePCCModuleOrganization(pccId, moduleCode)
        // Eliminar del store
        if (this.pcc.moduleOrganizations) {
          this.pcc.moduleOrganizations = this.pcc.moduleOrganizations.filter(
            (mo) => mo.module?.code !== moduleCode
          )
        }
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
      }
    },
    async loadCycleAssessmentTools(cycleId) {
      try {
        const response = await api.getCycleAssessmentTools(cycleId)
        return response.data
      } catch (error) {
        this.addMessage('error', error)
        return []
      }
    },
    async loadPCCAgreedAssessmentTools(pccId) {
      try {
        const response = await api.getPCCAgreedAssessmentTools(pccId)
        if (!this.pcc.agreedAssessmentTools) {
          this.pcc.agreedAssessmentTools = []
        }
        this.pcc.agreedAssessmentTools = response.data
        return response.data
      } catch (error) {
        this.addMessage('error', error)
        return []
      }
    },
    async savePCCAgreedAssessmentTool(pccId, data) {
      try {
        const response = await api.createPCCAgreedAssessmentTool(pccId, data)
        // Actualizar el store
        if (!this.pcc.agreedAssessmentTools) {
          this.pcc.agreedAssessmentTools = []
        }
        const index = this.pcc.agreedAssessmentTools.findIndex(
          (tool) => tool.assessmentTool?.id === data.assessmentToolId
        )
        if (index > -1) {
          this.pcc.agreedAssessmentTools[index] = response.data
        } else {
          this.pcc.agreedAssessmentTools.push(response.data)
        }
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
      }
    },
    async deletePCCAgreedAssessmentTool(pccId, assessmentToolId) {
      try {
        await api.deletePCCAgreedAssessmentTool(pccId, assessmentToolId)
        // Eliminar del store
        if (this.pcc.agreedAssessmentTools) {
          this.pcc.agreedAssessmentTools = this.pcc.agreedAssessmentTools.filter(
            (tool) => tool.assessmentTool?.id !== assessmentToolId
          )
        }
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
      }
    },
    async savePCCTrainingPlan(pccId, data) {
      try {
        const response = await api.savePCCTrainingPlan(pccId, data)
        this.pcc.trainingPlan = response.data
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
      }
    },
    async deletePCCTrainingPlan(pccId) {
      try {
        await api.deletePCCTrainingPlan(pccId)
        this.pcc.trainingPlan = null
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
      }
    },
    async loadCenterProjects() {
      try {
        const response = await api.getCenterProjects()
        return response.data
      } catch (error) {
        this.addMessage('error', error)
        return []
      }
    },
    async loadModuleCenterProjects(pccId, moduleCode) {
      try {
        const response = await api.getModuleCenterProjects(pccId, moduleCode)
        return response.data
      } catch (error) {
        this.addMessage('error', error)
        return []
      }
    },
    async addModuleCenterProjects(pccId, moduleCode, centerProjectIds) {
      try {
        await api.addModuleCenterProjects(pccId, moduleCode, centerProjectIds)
        this.addMessage('success', 'Projectes de centre afegits al mòdul')
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
      }
    },
    async removeModuleCenterProject(pccId, moduleCode, centerProjectId) {
      try {
        await api.removeModuleCenterProject(pccId, moduleCode, centerProjectId)
        this.addMessage('success', 'Projecte de centre eliminat del mòdul')
        return true
      } catch (error) {
        this.addMessage('error', error)
        return false
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
        this.syllabus.lastYearImprovementProposal = response.data
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
        // Borramos su temporalización en empresa si existe
        this.syllabus.schedules.forEach((schedule) => {
          const index = schedule.inCompanyTrainingEntries.findIndex(
            (item) => item.learningSituationId == lsId
          )
          if (index > -1) {
            schedule.inCompanyTrainingEntries.splice(index, 1)
          }
        })
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
    },
    async saveLSTransversalObjectives(lsId, data) {
      try {
        await api.saveLearningSituationTransversalObjectives(lsId, data)
      } catch (error) {
        if (error.response?.status != 422) {
          this.addMessage('error', error)
        }
        return error
      }
      this.addMessage('success', 'Objectius transversals guardats')
      return 'ok'
    }
  }
})
