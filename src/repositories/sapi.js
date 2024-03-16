import axios from 'axios'
import ciclos from './ciclos.json'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
})

const auth = {
  login: (credentials) => apiClient.post('/auth/login', credentials)
}

const cicles = {
  getAll: () => apiClient.get(`/todos`),
  getRA: () => apiClient.get('/')
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
    cicles,
}
