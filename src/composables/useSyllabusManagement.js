import { ref, computed } from 'vue'
import { api } from '../repositories/api.js'
import { useDataStore } from '../stores/data'

export function useSyllabusManagement() {
  const store = useDataStore()
  
  const syllabuses = ref([])
  const syllabusesToCopy = ref([])
  const isLoading = ref(false)

  // Helper: Obtener syllabus por turno
  const getSyllabusByTurn = (turn) => {
    return syllabuses.value.find(item => item.turn === turn) || {}
  }

  // Cargar syllabuses
  const loadSyllabuses = async (cycleId, moduleCode) => {
    if (!cycleId || !moduleCode) return

    isLoading.value = true
    try {
      const [respSyl, respSylToCopy] = await Promise.all([
        api.getSyllabusByCycleAndModule(cycleId, moduleCode),
        api.syllabusToCopy(moduleCode)
      ])
      
      syllabuses.value = respSyl.data
      syllabusesToCopy.value = respSylToCopy.data
    } catch (error) {
      syllabuses.value = []
      syllabusesToCopy.value = []
      store.addMessage('error', error)
    } finally {
      isLoading.value = false
    }
  }

  // Crear syllabus
  const createSyllabus = async (cycleId, moduleCode, turn) => {
    try {
      await api.createSyllabus({
        cycleId: parseInt(cycleId),
        moduleCode,
        turn
      })
      store.addMessage('success', 'Programació creada')
      return true
    } catch (error) {
      store.addMessage('error', error)
      return false
    }
  }

  // Copiar de otro syllabus
  const copySyllabusFromOther = async (sourceSyllabusId, destinationCycleId, destinationTurn) => {
    try {
      await api.createSyllabusFromOther(sourceSyllabusId, {
        destinationCycleId: parseInt(destinationCycleId),
        destinationTurn
      })
      store.addMessage('success', 'Programació creada')
      return true
    } catch (error) {
      store.addMessage('error', error)
      return false
    }
  }

  // Copiar del año anterior
  const copySyllabusFromLastYear = async (syllabusId) => {
    try {
      await api.createSyllabusCourseYear(syllabusId)
      store.addMessage('success', 'Programació creada')
      return true
    } catch (error) {
      store.addMessage('error', error)
      return false
    }
  }

  // Guardar propuestas de mejora
  const saveImprovementProposals = async (syllabusId, proposals) => {
    try {
      const response = await api.createImprovement(syllabusId, { proposals })
      store.addMessage('success', 'Propostes de millora guardades')
      return response.data
    } catch (error) {
      store.addMessage('error', error)
      return null
    }
  }

  // Copiar URL al portapapeles
  const copySyllabusUrl = async (syllabus) => {
    const url = `${window.location.origin}/public/syllabus/${syllabus.center.code}/${syllabus.cycle.id}/${syllabus.module.code}/${syllabus.turn}`
    
    try {
      await navigator.clipboard.writeText(url)
      store.addMessage('success', 'Enllaç copiat al portapapers')
    } catch (err) {
      store.addMessage('error', `Error al copiar: ${err}`)
    }
  }

  // Abrir PDF
  const openPdf = (syllabus) => {
    const url = `${window.location.origin}/public/syllabus/${syllabus.center.code}/${syllabus.cycle.id}/${syllabus.module.code}/${syllabus.turn}`
    window.open(url, '_blank')
  }

  return {
    syllabuses,
    syllabusesToCopy,
    isLoading,
    getSyllabusByTurn,
    loadSyllabuses,
    createSyllabus,
    copySyllabusFromOther,
    copySyllabusFromLastYear,
    saveImprovementProposals,
    copySyllabusUrl,
    openPdf
  }
}
