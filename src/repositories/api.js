import axios from 'axios'

export default class ApiService {
  constructor(token) {
      this.instance = axios.create({
          baseURL:  import.meta.env.VITE_API_URL,
          headers: {
              Authorization: 'Bearer ' + token,
          }
      })
//      this.setupInterceptors(token)
  }

  async arregla(data) {
    this.instance.put('/cicles/'+data.id, data);
  }
  async login(credentials) {
    return this.send('post', '/auth/login', credentials)
  }
  async logout() {
    return this.send('post', '/auth/logout')
  }
  getCicles() {
    return this.send('get', '/cicles')
  }
  getModules(cicleId) {
    return this.send('get', '/modules?department_id=' + cicleId)
  }
  getLearningResults(moduleId) {
    return this.send('get', '/learning_result?department_id=' + moduleId)
  }
  getEvaluationCriteria(learningResults) {
    const query = learningResults.map((lr) => 'learning_result_id='+lr).join('&')
    return query
      ? this.send('get', '/evaluation_criteria?' + query)
      : []
  }
  getContentsBlocks(moduleId) {
    return this.send('get', '/contents_block?module_code=' + moduleId)
  }
  async getProgramming(cycleId, moduleId) {
    try {
      const prog = await this.send('get', `/programmings?cycle_id=${cycleId}&module_code=${moduleId}`)
      return prog
    } catch (error) {
      if (error?.response?.status == 404) {
        return [{}]
      }
      throw error
    }
  }
  addProgramming(cycle_id, module_id) {
    return this.send('post', `/programmings`, { cycle_id, module_id })
  }
  getWorkUnits(programmingId) {
    return this.send('get', '/work_units?programming_id=' + programmingId)
  }
  saveWorkUnit(unit) {
    if (unit.id) {
      return this.send('put', `/work_units/${unit.id}`, unit)
    } else {
      return this.send('post', `/work_units`, unit)
    }
  }
  delWorkUnit(unitId) {
    return this.send('delete', `/work_units/${unitId}`)
  }

async send(method, endpoint, data) {
    const response = await this.instance[method](endpoint, data);
    return response.data;
}

auth() {
    return {
      login: (credentials) => this.instance.post('/auth/login', credentials),
      logout: () => this.instance.get('/auth/logout'),
    }
  }

  data() {
    return {
      getCicles: () => this.instance.get('/ciclos'),
    }
  }

  offers() {
    return {
      getAll: () => this.instance.get('/ofertas'),
    }
  }
}

/*
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Authorization': (localStorage.user) ? 'Bearer ' + JSON.parse(localStorage.user).access_token : ''
  }
})

console.log('############### apiClient')
const auth = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  logout: () => apiClient.get('/auth/logout'),
}

const data = {
  getCicles: () => apiClient.get('/ciclos'),
}

const offers = {
  getAll: () => apiClient.get('/ofertas'),
}

const todos = {
    getAll: () => apiClient.get(`/todos`),
    getOne: (id) => apiClient.get(`/todos/${id}`),
    create: (item) => apiClient.post(`/todos`, item),
    modify: (item) => apiClient.put(`/todos/${item.id}`, item),
    delete: (id) => apiClient.delete(`/todos/${id}`),
    toogleDone: (item) => apiClient.put(`/categories/${item.id}`, {
      id: item.id,
      title: item.title, 
      done: !item.done
    }),
}

const categories = {
    getAll: () => apiClient.get(`/categories`),
    getOne: (id) => apiClient.get(`/categories/${id}`),
    create: (item) => apiClient.post(`/categories`, item),
    modify: (item) => apiClient.put(`/categories/${item.id}`, item),
    delete: (id) => apiClient.delete(`/categories/${id}`),
}


export default {
    auth,
    data,
    offers,
}
*/