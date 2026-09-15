import { computed } from 'vue'

export function useDateValidation(currentData) {
  const canEdit = computed(() => {
    if (!currentData.value?.syllabusStartDate || !currentData.value?.syllabusFinishDate) {
      return false
    }

    const today = new Date()
    const startDate = parseDate(currentData.value.syllabusStartDate)
    const finishDate = parseDate(currentData.value.syllabusFinishDate)

    return today >= startDate && today <= finishDate
  })

  const parseDate = (dateString) => {
    const [day, month, year] = dateString.split('/')
    return new Date(year, month - 1, day)
  }

  return {
    canEdit
  }
}
