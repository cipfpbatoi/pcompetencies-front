<script setup>
import { ref } from 'vue'
import ActionButton from './ActionButton.vue'
import { api } from '@/repositories/api'
import { useDataStore } from '@/stores/data'

// ==========================================
// 📋 PROPS & EMITS
// ==========================================
const props = defineProps({
  // Para Syllabus
  syllabus: {
    type: Object,
    default: null
  },
  // Para PCC
  pcc: {
    type: Object,
    default: null
  },
  // Tipo de documento: 'syllabus' | 'pcc'
  type: {
    type: String,
    default: 'syllabus',
    validator: (value) => ['syllabus', 'pcc'].includes(value)
  },
  buttonClass: {
    type: String,
    default: 'btn btn-danger col-12 col-sm-5'
  },
  title: {
    type: String,
    default: 'Veure PDF'
  }
})

const emit = defineEmits(['waiting'])

// ==========================================
// 🏪 STORE
// ==========================================
const store = useDataStore()
const { addMessage } = store

// ==========================================
// 📊 ESTADO LOCAL
// ==========================================
const isProcessing = ref(false)

// ==========================================
// 💡 COMPUTED
// ==========================================
const computedTitle = () => {
  if (props.title) return props.title
  return props.type === 'pcc' ? 'Veure PDF del PCC' : 'Veure esborrany'
}

// ==========================================
// 🔧 MÉTODOS
// ==========================================

// Obtener datos según el tipo
const getDocumentData = () => {
  if (props.type === 'pcc') {
    return props.pcc
  }
  return props.syllabus
}

// Generar nombre del archivo
const generateFileName = () => {
  const doc = getDocumentData()
  
  if (props.type === 'pcc') {
    // Nombre para PCC: CentreCode-CycleShortName-CourseYear-PCC.pdf
    return `${doc.center?.code || 'PCC'}-${doc.cycle?.shortName?.split(' ').join('_') || 'Cicle'}-${doc.courseYear || new Date().getFullYear()}-PCC.pdf`
  }
  
  // Nombre para Syllabus (original)
  return `${doc.center.code}-${doc.cycle.shortName.split(' ').join('_')}-${doc.module.code}-${doc.courseYear}-${doc.turn}.pdf`
}

// Obtener PDF desde API
const fetchPdf = async () => {
  const doc = getDocumentData()
  
  if (props.type === 'pcc') {
    return await api.getPCCPdf(doc.id) // Nuevo método API para PCC
  }
  
  return await api.getPdf(doc.id) // Método existente para Syllabus
}

// Mostrar PDF
const showPdf = async () => {
  // Validar que exista el documento
  const doc = getDocumentData()
  if (!doc || !doc.id) {
    addMessage('error', 'No hi ha document per mostrar')
    return
  }

  isProcessing.value = true
  emit('waiting', true)

  try {
    // Obtener PDF desde API
    const response = await fetchPdf()
    
    if (!response || !response.data) {
      addMessage('error', 'No s\'ha pogut obtenir el PDF')
      return
    }

    // Crear Blob y URL
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)

    // Opción 1: Abrir en nueva ventana (recomendado)
    const newWindow = window.open(url, '_blank')
    
    if (!newWindow) {
      // Si el navegador bloquea popups, intentar descarga
      downloadPdf(url)
    } else {
      // Limpiar URL después de un tiempo
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)
    }

    addMessage('success', 'PDF carregat correctament')

  } catch (error) {
    console.error('Error al carregar PDF:', error)
    addMessage('error', error.response?.data?.message || 'Error al carregar el PDF')
  } finally {
    isProcessing.value = false
    emit('waiting', false)
  }
}

// Método auxiliar para descargar
const downloadPdf = (url) => {
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', generateFileName())
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Limpiar URL
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 100)
}
</script>

<template>
  <ActionButton
    :buttonClass="buttonClass"
    :title="computedTitle()"
    :disabled="isProcessing"
    icon-class="bi bi-file-earmark-pdf-fill"
    @click="showPdf"
  >
    <template v-if="isProcessing">
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      Carregant...
    </template>
  </ActionButton>
</template>
