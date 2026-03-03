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
  cycle: {
    type: Object,
    default: null
  },
  centerCode: {
    type: String,
    default: ''
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

const sanitizeFilePart = (value) => {
  if (!value) return ''
  const noSpaces = String(value).replace(/\s+/g, '')
  const normalized = noSpaces.normalize ? noSpaces.normalize('NFD') : noSpaces
  const withoutDiacritics = normalized.replace(/[\u0300-\u036f]/g, '')
  return withoutDiacritics.replace(/[^A-Za-z0-9_-]/g, '')
}

// Generar nombre del archivo
const generateFileName = () => {
  const doc = getDocumentData()

  if (props.type === 'pcc') {
    const centerCodeRaw =
      props.centerCode ||
      doc.center?.code ||
      doc.centerCode ||
      doc.cycle?.center?.code ||
      doc.cycle?.centerCode ||
      props.cycle?.center?.code ||
      props.cycle?.centerCode ||
      'PCC'
    const cycleShortNameRaw =
      doc.cycle?.shortName ||
      doc.cycle?.completeName ||
      doc.cycle?.name ||
      props.cycle?.shortName ||
      props.cycle?.completeName ||
      props.cycle?.name
    const centerCode = sanitizeFilePart(centerCodeRaw || 'PCC')
    const cycleShortName = sanitizeFilePart(cycleShortNameRaw || 'Cicle')
    const courseYear = doc.courseYear || new Date().getFullYear()
    const isDraft = ['pending', 'pendent'].includes(doc.status)
    const draftPart = isDraft ? '-borrador' : ''
    return `${centerCode}-${cycleShortName}-${courseYear}-PCC${draftPart}.pdf`
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
      addMessage('error', "No s'ha pogut obtenir el PDF")
      return
    }

    // Crear Blob y URL
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)

    if (props.type === 'pcc' || props.type === 'syllabus') {
      downloadPdf(url)
    } else {
      const newWindow = window.open(url, '_blank')
      if (!newWindow) {
        downloadPdf(url)
      } else {
        setTimeout(() => {
          URL.revokeObjectURL(url)
        }, 1000)
      }
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
    @click="showPdf"
  >
    <template v-if="isProcessing">
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      Descargando...
    </template>
    <template v-else>
      <i class="bi bi-file-earmark-pdf-fill me-2"></i>
      {{ computedTitle() }}
    </template>
  </ActionButton>
</template>
