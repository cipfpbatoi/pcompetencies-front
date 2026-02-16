import { ref } from 'vue'
import { api } from '../repositories/api.js'
import { useDataStore } from '../stores/data'
import { storeToRefs } from 'pinia'

export function usePCCManagement() {
  const store = useDataStore()

  const { pcc } = storeToRefs(store)
  const isLoadingPCC = ref(false)

  // Cargar PCC por ciclo
  const loadPCC = async (cycleId) => {
    if (!cycleId) {
      pcc.value = {}
      return
    }

    isLoadingPCC.value = true
    try {
      localStorage.pccCycleId = cycleId
      const response = await api.getPCCByCycleId(cycleId)
      pcc.value = response.data
    } catch (error) {
      pcc.value = {}
      // No mostrar error si simplemente no existe
      if (error.response?.status !== 404) {
        store.addMessage('error', error)
      }
    } finally {
      isLoadingPCC.value = false
    }
  }

  // Verificar si existe PCC
  const hasPCC = () => {
    return pcc.value && Object.keys(pcc.value).length > 0 && pcc.value.id
  }

  // Crear nuevo PCC
  const createPCC = async (cycleId) => {
    try {
      const response = await api.createPCC({ cycleId: parseInt(cycleId) })
      pcc.value = response.data
      store.addMessage('success', 'PCC creat correctament')
      return true
    } catch (error) {
      store.addMessage('error', error)
      return false
    }
  }

  // Editar PCC existente
  const editPCC = async (pccId) => {
    try {
      // Aquí podrías redirigir o abrir modal de edición
      return pccId
    } catch (error) {
      store.addMessage('error', error)
      return null
    }
  }

  // Añadir módulos al PCC
  const addModulesToPCC = async (pccId, moduleCodes) => {
    try {
      return await store.addModuleToPCC(pccId, moduleCodes)
    } catch (error) {
      store.addMessage('error', error)
      return false
    }
  }

  // Eliminar módulo del PCC
  const removeModuleFromPCC = async (pccId, moduleCode) => {
    try {
      return await store.removeModuleFromPCC(pccId, moduleCode)
    } catch (error) {
      store.addMessage('error', error)
      return false
    }
  }

  return {
    pcc,
    isLoadingPCC,
    loadPCC,
    hasPCC,
    createPCC,
    editPCC,
    addModulesToPCC,
    removeModuleFromPCC
  }
}
