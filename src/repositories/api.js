import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL
const instance = axios.create({
  baseURL: BASE_URL,
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
      // Token caducado
      // Eliminar el token caducado del almacenamiento local
      localStorage.removeItem('token')
      // Redireccionar al usuario al inicio de sesión
      if (!['/', '/login'].includes(window.location.pathname)) {
        localStorage.redirect = JSON.stringify({
          path: window.location.pathname,
          message: (error.response.data?.message) ? error.response.data?.message : 'La sessió ha caducat. Per favor, loguejat de nou'
        })  
        window.location.replace('/login') // Redirigir a la página de inicio de sesión
      }
      //      router.push('/login')
    }
    return Promise.reject(error)
  }
)

// Métodos para acceder a las rutas de la API
export const api = {
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
    saveSchedule: (id, data) =>
    instance.post(`/syllabus/${id}/schedule`, data),
  deleteSchedule: (id, shId) =>
    instance.delete(`/syllabus/${id}/schedule/${shId}`),
  createTransversalObjective: (lsId, data) => instance.post(`/syllabus/learningSituation/${lsId}/transversal-objectives`, data),
  getTrasversalObjectives: () => instance.get('/transversal-objectives'),
  saveLearningSituationTransversalObjectives: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/transversal-objectives`, data),
  
  // Login Check
  loginCheck: (userData) => instance.post('/login_check', userData),
  userCurrent: () => instance.get('/user/current'),

  // Module
  getModules: () => instance.get('/module'),
  getModuleByCode: (code) => instance.get(`/module/${code}`),

  // Syllabus
  getSyllabusesPaginated: (filter) => instance.get('/syllabus?'+filter),
  getSyllabusByCycleAndModule: (cycleId, moduleCode) =>
    instance.get(`/syllabus/cycle/${cycleId}/module/${moduleCode}`),
  getSyllabusById: (id) => instance.get(`/syllabus/${id}`),
  createSyllabus: (data) => instance.post('/syllabus', data),
  createSyllabusCourseYear: (id) => instance.post(`/syllabus/${id}/currentCourseYear`, {}),
  createSyllabusGroupContext: (id, data) => instance.post(`/syllabus/${id}/groupContext`, data),
  getSyllabusMarlingActivities: (id) => instance.get(`/syllabus/${id}/marking`),
  saveSyllabusMarkingActivities: (id, data) => instance.post(`/syllabus/${id}/marking`, data),
  getSyllabusInstructionalUnits: (id) => instance.get(`/syllabus/${id}/instructionalUnit`),
  saveSyllabusInstructionalUnit: (id, data) => instance.post(`/syllabus/${id}/instructionalUnit`, data),
  deleteSyllabusInstructionalUnit: (id, iUId) => instance.delete(`/syllabus/${id}/instructionalUnit/${iUId}`),
  saveSyllabusMaterials: (id, data) => instance.post(`/syllabus/${id}/material`, data),

  // Syllabus status
  syllabusValidate: (id) => instance.post(`${BASE_URL}syllabus/${id}/valida`, {}),
  syllabusSend: (id) => instance.post(`/syllabus/${id}/send`, {}),
  syllabusToCopy: (code) => instance.get(`/syllabus/module/${code}`),
  createSyllabusFromOther: (id, data) => instance.post(`/syllabus/${id}/copy`, data),

  getPdf: (id) => axios.get(`${BASE_URL}syllabus/${id}/pdf`, {
    headers: {
      Authorization: `Bearer ${localStorage.token}`,
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
  getFinalActivities: (id) =>
    instance.get(`/syllabus/${id}/final/activity`),
  saveFinalActivity: (id, data) =>
    instance.post(`/syllabus/${id}/final/activity`, data),
  deleteFinalActivity: (id, activityId) =>
    instance.delete(`/syllabus/${id}/final/activity/${activityId}`),

  // Complementary Activities
  getComplementaryActivities: (id) =>
    instance.get(`/syllabus/${id}/complementaryActivities`),
  saveComplementaryActivity: (id, data) =>
    instance.post(`/syllabus/${id}/activity/complementary`, data),
  deleteComplementaryActivity: (id, activityId) =>
    instance.delete(`/syllabus/${id}/ComplementaryActivity/${activityId}`),

  // Methodological Principles
  getMethodologicalPrinciples: () =>
    instance.get(`/methodological-principles`),
  getSyllabusMethodologicalPrinciples: (id) =>
    instance.get(`/syllabus/${id}/methodological-principles`),
  saveMethodologicalPrinciples: (id, data) =>
    instance.post(`/syllabus/${id}/methodological-principles`, data),

  }

export default instance
