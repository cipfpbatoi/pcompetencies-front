import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL
const instance = axios.create({
  baseURL: BASE_URL
})

// Interceptor para adjuntar el token JWT a las solicitudes
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar errores de token caducado
instance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      let isExpiredJWT =
        error.response.data?.message && error.response.data.message === 'Expired JWT Token'
      if (isExpiredJWT && !localStorage.getItem('token')) {
        return
      }
      localStorage.removeItem('token')
      if (!['login/', '/login'].includes(window.location.pathname)) {
        localStorage.redirect = JSON.stringify({
          path: window.location.pathname,
          message: isExpiredJWT
            ? 'La sessió ha caducat. Per favor, loguejat de nou'
            : error.response.data?.message
        })
        window.location.replace('/login') // Redirigir a la página de inicio de sesión
      }
    }
    return Promise.reject(error)
  }
)

// Métodos para acceder a las rutas de la API
export const api = {
  // PCC
  getPCCByCycleId: (cycleId) => instance.get(`/pcc/cycle/${cycleId}`),
  createPCC: (data) => instance.post('/pcc', data),
  createPccOportunities: (id, text) => instance.post(`/pcc/${id}/opportunities`, { opportunities: text }),
  createPccEnvironment: (id, text) => instance.post(`/pcc/${id}/sep-environment`, { SEPEnvironment: text }),
  savePccSustainabilityCriteria: (id, text) => instance.post(`/pcc/${id}/sustainability-criteria`, { criteriaAdaptingSostenibilityAndDigitalModules: text }),
  getPCCPdf: (pccId) =>
    axios.get(`${BASE_URL}pcc/${pccId}/pdf`, {
      headers: {
        Authorization: `Bearer ${localStorage.token}`
      },
      responseType: 'blob'
    }),

  getPCCMethodologicalPrinciples: (pccId, mpContext) => instance.get(`/pcc/${pccId}/mp-context`, mpContext),
  savePCCMethodologicalPrinciple: (pccId, data) => instance.post(`/pcc/${pccId}/mp-context`, data),
  deletePCCMethodologicalPrinciple: (pccId, mpId) => instance.delete(`/pcc/${pccId}/mp-context/${mpId}`),
  addPCCModules: (pccId, moduleCodes) => instance.post(`/pcc/${pccId}/modules`, { moduleCodes }),
  removePCCModule: (pccId, moduleCode) => instance.delete(`/pcc/${pccId}/modules/${moduleCode}`),
  createPCCModuleOrganization: (pccId, data) => instance.post(`/pcc/${pccId}/module-organization`, data),
  deletePCCModuleOrganization: (pccId, moduleCode) => instance.delete(`/pcc/${pccId}/module-organization/module/${moduleCode}`),
  getCycleAssessmentTools: (cycleId) => instance.get(`/cycle/${cycleId}/assessment-tools`),
  getPCCAgreedAssessmentTools: (pccId) => instance.get(`/pcc/${pccId}/agreed-assessment-tools`),
  createPCCAgreedAssessmentTool: (pccId, data) => instance.post(`/pcc/${pccId}/agreed-assessment-tool`, data),
  deletePCCAgreedAssessmentTool: (pccId, assessmentToolId) => instance.delete(`/pcc/${pccId}/agreed-assessment-tools/${assessmentToolId}`),
  savePCCTrainingPlan: (pccId, data) => instance.post(`/pcc/${pccId}/training_plan`, data),
  deletePCCTrainingPlan: (pccId) => instance.delete(`/pcc/${pccId}/training_plan`),
  getCenterProjects: () => instance.get('/center-projects'),
  getModuleCenterProjects: (pccId, moduleCode) => instance.get(`/curricular-projects/${pccId}/module/${moduleCode}/center-projects`),
  addModuleCenterProjects: (pccId, moduleCode, centerProjectIds) => instance.post(`/curricular-projects/${pccId}/modules/${moduleCode}/center-projects`, { centerProjectIds }),
  removeModuleCenterProject: (pccId, moduleCode, centerProjectId) => instance.delete(`/curricular-projects/${pccId}/modules/${moduleCode}/center-projects/${centerProjectId}`),

  // Center
  getAsessmentTool: () => instance.get('/assessmentTool'),
  getMarkingTool: () => instance.get('/markingTool'),
  getCurrentData: () => instance.get('/currentSchoolYear'),

  // Cycles
  getCycles: () => instance.get('/cycles'),
  getCycleById: (id) => instance.get(`/cycles/${id}`),

  // ImprovementSyllabus
  getImprovementStatus: () => instance.get('/improvements/status'),
  createImprovement: (id, data) => instance.post(`/syllabus/${id}/improvements`, data),
  evaluateImprovement: (id, data) => instance.put(`/syllabus/${id}/improvements/evaluate`, data),

  // LearningSituation
  getLearningSituationById: (id) => instance.get(`/learningSituation/${id}`),
  deleteLearningSituation: (id) => instance.delete(`/learningSituation/${id}`),
  replaceLearningSituation: (lsId, data) =>
    instance.put(`/syllabus/learningSituation/${lsId}`, data),
  saveLearningSituationObjectives: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/objectives`, data),
  saveLearningSituationCompetences: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/competences`, data),
  saveLearningSituationPriorKnowledge: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/priorKnowledge`, data),
  createLearningSituation: (id, data) => instance.post(`/syllabus/${id}/learningSituation`, data),
  getLearningSituationsBySyllabusId: (id) => instance.get(`/syllabus/${id}/learningSituations`),
  saveLearningSituationContents: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/didacticContents`, data),
  saveLearningSituationSchedule: (lsId, data) =>
    instance.put(`/syllabus/${lsId}/schedule/${data.nameGroup}/learning_situation_entry`, data),
  saveSchedule: (id, data) => instance.post(`/syllabus/${id}/schedule`, data),
  deleteSchedule: (id, shId) => instance.delete(`/syllabus/${id}/schedule/${shId}`),
  generateSchedule: (id, schedule) => instance.post(`/syllabus/${id}/schedule/${schedule.nameGroup}/generate-learning-situations`, schedule),
  getInCompanyTrainingRestrictions: (id) => instance.get(`/syllabus/${id}/restrictions/InCompanyTraining`),
  createTransversalObjective: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/transversal-objectives`, data),
  getTrasversalObjectives: () => instance.get('/transversal-objectives'),
  saveLearningSituationTransversalObjectives: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/transversal-objectives`, data),

  // Login Check
  loginCheck: (userData) => instance.post('/login_check', userData),
  userCurrent: () => instance.get('/user/current'),
  loginIntranet: (token) => instance.post('/token', { userToken: token }),

  // Module
  getModules: () => instance.get('/module'),
  getModuleByCode: (code) => instance.get(`/module/${code}`),

  // Syllabus
  getSyllabusesPaginated: (filter) => instance.get('/syllabus?' + filter),
  getSyllabusByCycleAndModule: (cycleId, moduleCode) =>
    instance.get(`/syllabus/cycle/${cycleId}/module/${moduleCode}`),
  getSyllabusById: (id) => instance.get(`/syllabus/${id}`),
  createSyllabus: (data) => instance.post('/syllabus', data),
  createSyllabusCourseYear: (id) => instance.post(`/syllabus/${id}/currentCourseYear`, {}),
  createSyllabusGroupContext: (id, data) => instance.post(`/syllabus/${id}/groupContext`, data),
  getSyllabusMarkingActivities: (id) => instance.get(`/syllabus/${id}/marking`),
  saveSyllabusMarkingActivities: (id, data) => instance.post(`/syllabus/${id}/marking`, data),
  getSyllabusInstructionalUnits: (id) => instance.get(`/syllabus/${id}/instructionalUnit`),
  saveSyllabusInstructionalUnit: (id, data) =>
    instance.post(`/syllabus/${id}/instructionalUnit`, data),
  deleteSyllabusInstructionalUnit: (id, iUId) =>
    instance.delete(`/syllabus/${id}/instructionalUnit/${iUId}`),
  saveSyllabusMaterials: (id, data) => instance.post(`/syllabus/${id}/material`, data),
  saveOtherConsiderations: (id, data) => instance.post(`/syllabus/${id}/others`, data),

  // Syllabus status
  syllabusValidate: (id) => instance.post(`${BASE_URL}syllabus/${id}/valida`, {}),
  syllabusSend: (id) => instance.post(`/syllabus/${id}/send`, {}),
  syllabusToCopy: (code) => instance.get(`/syllabus/module/${code}`),
  createSyllabusFromOther: (id, data) => instance.post(`/syllabus/${id}/copy`, data),
  syllabusApprove: (id) => instance.post(`${BASE_URL}syllabus/${id}/approve`, {}),
  syllabusReject: (id, data) => instance.post(`${BASE_URL}syllabus/${id}/reject`, data),
  syllabusPending: (id) => instance.post(`${BASE_URL}syllabus/${id}/pending`, {}),

  getPdf: (id) =>
    axios.get(`${BASE_URL}syllabus/${id}/pdf`, {
      headers: {
        Authorization: `Bearer ${localStorage.token}`
      },
      responseType: 'blob'
    }),
  getPublicPdf: (collegeCode, cycleId, moduleCode, turn) =>
    axios.get(`${BASE_URL}public/syllabus/${collegeCode}/${cycleId}/${moduleCode}/${turn}`, {
      responseType: 'blob'
    }),

  getApprovedDocumentsBySyllabusId: (syllabusId) =>
    instance.get(`/syllabus/${syllabusId}/approvedDocument/`),

  getApprovedDocumentPdf: (approvedDocumentId) =>
    axios.get(`${BASE_URL}public/syllabus/approvedDocument/${approvedDocumentId}`, {
      responseType: 'blob'
    }),

  getExcel: (id, data) =>
    axios.post(`${BASE_URL}syllabus/${id}/excel`, data, {
      headers: {
        Authorization: `Bearer ${localStorage.token}`
      },
      responseType: 'blob'
    }),

  // Activities
  saveActivity: (lsId, type, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/activity/${type}`, data),
  saveDeepingActivity: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/activity/deepening`, data),
  saveReinforcementActivity: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/activity/reinforcement`, data),
  saveFormativeActivity: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/activity/formative`, data),
  saveMarkingActivity: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/activity/marking`, data),
  deleteActivity: (lsId, activityId) =>
    instance.delete(`/syllabus/learningSituation/${lsId}/activity/${activityId}`),

  // Final Activities
  getFinalActivities: (id) => instance.get(`/syllabus/${id}/final/activity`),
  saveFinalActivity: (id, data) => instance.post(`/syllabus/${id}/final/activity`, data),
  deleteFinalActivity: (id, activityId) =>
    instance.delete(`/syllabus/${id}/final/activity/${activityId}`),

  // Complementary Activities
  getComplementaryActivities: (id) => instance.get(`/syllabus/${id}/complementaryActivities`),
  saveComplementaryActivity: (id, data) =>
    instance.post(`/syllabus/${id}/activity/complementary`, data),
  deleteComplementaryActivity: (id, activityId) =>
    instance.delete(`/syllabus/${id}/ComplementaryActivity/${activityId}`),

  // Methodological Principles
  getMethodologicalPrinciples: () => instance.get(`/methodological-principles`),
  getSyllabusMethodologicalPrinciples: (id) =>
    instance.get(`/syllabus/${id}/methodological-principles`),
  saveMethodologicalPrinciples: (id, data) =>
    instance.post(`/syllabus/${id}/methodological-principles`, data)
}

export default instance
