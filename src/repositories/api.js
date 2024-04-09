import axios from 'axios'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL
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
      localStorage.redirect = JSON.stringify({
        path: window.location.pathname,
        message: 'La sessió ha caducat. Per favor, loguejat de nou'
      })
      window.location.replace('/login') // Redirigir a la página de inicio de sesión
      //      router.push('/login')
    }
    return Promise.reject(error)
  }
)

// Métodos para acceder a las rutas de la API
export const api = {
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
  createLearningSituationObjectives: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/objectives`, data),
  createLearningSituationPriorKnowledge: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/priorKnowledge`, data),
  createLearningSituation: (id, data) => instance.post(`/syllabus/${id}/learningSituation`, data),
  getLearningSituationsBySyllabusId: (id) => instance.get(`/syllabus/${id}/learningSituations`),
  saveLearningSituationContents: (lsId, data) =>
    instance.post(`/syllabus/learningSituation/${lsId}/didacticContents`, data),

  // Login Check
  loginCheck: (userData) => instance.post('/login_check', userData),

  // Module
  getModules: () => instance.get('/module'),
  getModuleByCode: (code) => instance.get(`/module/${code}`),

  // Syllabus
  getSyllabuses: () => instance.get('/syllabus'),
  getSyllabusByCycleAndModule: (cycleId, moduleCode) =>
    instance.get(`/syllabus/cycle/${cycleId}/module/${moduleCode}`),
  getSyllabusById: (id) => instance.get(`/syllabus/${id}`),
  createSyllabus: (data) => instance.post('/syllabus', data),
  createSyllabusGroupContext: (id, data) => instance.post(`/syllabus/${id}/groupContext`, data)
}

export default instance
