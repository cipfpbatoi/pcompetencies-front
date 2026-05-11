<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { useDataStore } from '@/stores/data'

const props = defineProps({
  pccId: {
    type: Number,
    required: true
  }
})

const store = useDataStore()
const { pcc, cycle } = storeToRefs(store)
const {
  addMessage,
  savePCCIntermodularGuide,
  savePCCIntermodularDistribution,
  savePCCIntermodularParticipant,
  deletePCCIntermodularParticipant,
  savePCCIntermodularOrientation,
  deletePCCIntermodularOrientation
} = store

const isSavingGuide = ref(false)
const distributionLoadingByLR = ref({})
const participantLoadingKey = ref('')
const participantErrors = ref({ 1: [], 2: [] })
const isSavingOrientation = ref(false)
const deletingOrientationKey = ref('')
const showOrientationModal = ref(false)
const editor = ClassicEditor
const editorConfig = {
  toolbar: [
    'heading',
    '|',
    'bold',
    'italic',
    'link',
    'bulletedList',
    'numberedList',
    '|',
    'blockQuote',
    'insertTable',
    '|',
    'undo',
    'redo'
  ],
  language: 'ca'
}

const tempForm = reactive({
  generalOrientations: '',
  firstCourse: {
    temporalizationOption: '',
    temporalizationDetails: '',
    weight: null
  },
  secondCourse: {
    temporalizationOption: '',
    temporalizationDetails: '',
    weight: null
  }
})

const participantSelectorByCourse = reactive({
  1: '',
  2: ''
})

const participantVisibilityOverrides = ref({})

const distributionForm = ref({})

const orientationForm = reactive({
  moduleCode: '',
  moduleName: '',
  courseLevel: null,
  supportLearningResultIds: [],
  supportActivitiesGuidance: ''
})

const validationErrors = ref({})
const distributionErrors = ref({})
const orientationErrors = ref({})

const getFieldErrors = (path) => validationErrors.value[path] || []
const hasFieldError = (path) => getFieldErrors(path).length > 0
const resetValidationErrors = () => {
  validationErrors.value = {}
}

const getDistributionErrors = (learningResultId) => distributionErrors.value[learningResultId] || []
const hasDistributionError = (learningResultId) => getDistributionErrors(learningResultId).length > 0
const resetDistributionErrors = (learningResultId = null) => {
  if (learningResultId === null) {
    distributionErrors.value = {}
    return
  }
  distributionErrors.value = {
    ...distributionErrors.value,
    [learningResultId]: []
  }
}

const getOrientationErrors = (path) => orientationErrors.value[path] || []
const hasOrientationError = (path) => getOrientationErrors(path).length > 0
const resetOrientationErrors = () => {
  orientationErrors.value = {}
}

const getParticipantErrors = (courseLevel) => participantErrors.value[courseLevel] || []
const hasParticipantErrors = (courseLevel) => getParticipantErrors(courseLevel).length > 0
const resetParticipantErrors = (courseLevel = null) => {
  if (courseLevel === null) {
    participantErrors.value = { 1: [], 2: [] }
    return
  }
  participantErrors.value = {
    ...participantErrors.value,
    [courseLevel]: []
  }
}

const tempOptions = [
  { value: 'center_attendance', label: 'Assistència al centre' },
  { value: 'before_fe_week', label: 'Abans de la setmana de FE' },
  { value: 'after_fe_week', label: 'Després de la setmana de FE' }
]

const guide = computed(() => pcc.value?.intermodularProjectGuide || null)

const asArray = (value) => (Array.isArray(value) ? value : [])

const isProjectModule = (module) => {
  const moduleName = `${module?.name || ''}`.toLowerCase()
  return !!(
    module?.proyect ||
    module?.project ||
    module?.isProject ||
    module?.isIntermodularProject ||
    module?.intermodularProject ||
    moduleName.includes('projecte intermodular') ||
    moduleName.includes('proyecto intermodular')
  )
}

const getCourseLabel = (courseLevel) => (Number(courseLevel) === 1 ? '1r curs' : '2n curs')
const getFieldPrefix = (courseLevel) => (courseLevel === 1 ? 'firstCourse' : 'secondCourse')
const getCourseForm = (courseLevel) => (courseLevel === 1 ? tempForm.firstCourse : tempForm.secondCourse)

const hasProjectCourse1 = computed(() => {
  return (pcc.value?.modules || []).some(
    (module) => isProjectModule(module) && Number(module?.courseLevel || 1) === 1
  )
})

const hasProjectCourse2 = computed(() => {
  return (pcc.value?.modules || []).some(
    (module) => isProjectModule(module) && Number(module?.courseLevel || 1) === 2
  )
})

const hasProjectInBothCourses = computed(() => hasProjectCourse1.value && hasProjectCourse2.value)

const availableProjectCourses = computed(() => {
  const courses = []
  if (hasProjectCourse1.value) courses.push(1)
  if (hasProjectCourse2.value) courses.push(2)
  return courses
})

const singleProjectCourseLevel = computed(() => {
  return availableProjectCourses.value.length === 1 ? availableProjectCourses.value[0] : null
})

const modulesByCode = computed(() => {
  const map = {}
  ;(cycle.value?.modules || []).forEach((module) => {
    if (module?.code) map[module.code] = module
  })
  ;(pcc.value?.modules || []).forEach((module) => {
    if (!module?.code) return
    map[module.code] = {
      ...(map[module.code] || {}),
      ...module,
      learningResults:
        module.learningResults && module.learningResults.length > 0
          ? module.learningResults
          : map[module.code]?.learningResults || []
    }
  })
  return map
})

const getModuleByCode = (moduleCode) => modulesByCode.value[moduleCode] || null

const mergeModuleWithCycle = (module) => {
  const cycleModule = (cycle.value?.modules || []).find((item) => item.code === module.code)
  return {
    ...cycleModule,
    ...module,
    learningResults:
      module.learningResults && module.learningResults.length > 0
        ? module.learningResults
        : cycleModule?.learningResults || []
  }
}

const getModuleLabel = (moduleCode) => {
  const module = getModuleByCode(moduleCode)
  if (!module) return moduleCode || ''
  return `${module.code} - ${module.name}`
}

const projectModulesByCourse = computed(() => {
  const grouped = { 1: [], 2: [] }
  ;(pcc.value?.modules || []).forEach((module) => {
    if (!isProjectModule(module)) return
    const level = Number(module?.courseLevel || 1)
    if (grouped[level]) grouped[level].push(mergeModuleWithCycle(module))
  })
  return grouped
})

const projectLearningResults = computed(() => {
  const byId = {}
  ;[1, 2].forEach((courseLevel) => {
    projectModulesByCourse.value[courseLevel].forEach((module) => {
      ;(module.learningResults || []).forEach((learningResult) => {
        if (learningResult?.id && !byId[learningResult.id]) byId[learningResult.id] = learningResult
      })
    })
  })
  return Object.values(byId).sort((a, b) => Number(a.number || 0) - Number(b.number || 0))
})

const learningResultDistributions = computed(() => {
  return (
    pcc.value?.intermodularProjectLearningResultDistributions ||
    guide.value?.intermodularProjectLearningResultDistributions ||
    []
  )
})

const normalizeCourseLevels = (courseLevels) => {
  return [...new Set((courseLevels || []).map((level) => Number(level)).filter((level) => [1, 2].includes(level)))].sort(
    (a, b) => a - b
  )
}

const activeDistributionByCourse = computed(() => {
  const active = { 1: new Set(), 2: new Set() }
  learningResultDistributions.value.forEach((distribution) => {
    const learningResultId = distribution?.learningResult?.id || distribution?.learningResultId
    const normalizedCourseLevels = normalizeCourseLevels(
      distribution?.courseLevels || (distribution?.courseLevel ? [distribution.courseLevel] : [])
    )
    if (!learningResultId) return
    normalizedCourseLevels.forEach((courseLevel) => {
      active[courseLevel].add(learningResultId)
    })
  })
  return active
})

const getDistributionCourseLevelsFromStore = (learningResultId) => {
  const courseLevels = []
  if (activeDistributionByCourse.value[1].has(learningResultId)) courseLevels.push(1)
  if (activeDistributionByCourse.value[2].has(learningResultId)) courseLevels.push(2)

  if (!hasProjectInBothCourses.value) {
    return singleProjectCourseLevel.value ? [singleProjectCourseLevel.value] : []
  }

  if (learningResultDistributions.value.length === 0) return [1, 2]
  return courseLevels.length > 0 ? courseLevels : [1, 2]
}

const initDistributionForm = () => {
  const next = {}
  projectLearningResults.value.forEach((learningResult) => {
    next[learningResult.id] = getDistributionCourseLevelsFromStore(learningResult.id)
  })
  distributionForm.value = next
}

watch([projectLearningResults, learningResultDistributions, hasProjectInBothCourses], initDistributionForm, {
  immediate: true
})

const getActiveCourseLevelsForLearningResult = (learningResultId) => {
  if (!hasProjectInBothCourses.value) {
    return singleProjectCourseLevel.value ? [singleProjectCourseLevel.value] : []
  }
  return normalizeCourseLevels(
    distributionForm.value[learningResultId] || getDistributionCourseLevelsFromStore(learningResultId)
  )
}

const isDistributionOptionSelected = (learningResultId, option) => {
  const selectedLevels = getActiveCourseLevelsForLearningResult(learningResultId)
  if (option === '1') return selectedLevels.length === 1 && selectedLevels.includes(1)
  if (option === '2') return selectedLevels.length === 1 && selectedLevels.includes(2)
  return selectedLevels.length === 2 && selectedLevels.includes(1) && selectedLevels.includes(2)
}

const getDistributionOptionCourseLevels = (option) => {
  if (option === '1') return [1]
  if (option === '2') return [2]
  return [1, 2]
}

const learningResultsByCourse = computed(() => {
  return {
    1: projectLearningResults.value.filter((learningResult) =>
      getActiveCourseLevelsForLearningResult(learningResult.id).includes(1)
    ),
    2: projectLearningResults.value.filter((learningResult) =>
      getActiveCourseLevelsForLearningResult(learningResult.id).includes(2)
    )
  }
})

const saveLearningResultDistribution = async (learningResultId, desiredCourseLevels) => {
  resetDistributionErrors(learningResultId)
  distributionLoadingByLR.value = {
    ...distributionLoadingByLR.value,
    [learningResultId]: true
  }

  const current = getDistributionCourseLevelsFromStore(learningResultId)
  const nextCourseLevels = normalizeCourseLevels(desiredCourseLevels)

  if (nextCourseLevels.length === 0) {
    distributionLoadingByLR.value = {
      ...distributionLoadingByLR.value,
      [learningResultId]: false
    }
    distributionForm.value = {
      ...distributionForm.value,
      [learningResultId]: current
    }
    return
  }

  distributionForm.value = {
    ...distributionForm.value,
    [learningResultId]: nextCourseLevels
  }

  try {
    const result = await savePCCIntermodularDistribution(props.pccId, {
      learningResultId,
      courseLevels: nextCourseLevels
    })
    if (result !== 'ok') {
      if (result?.response?.status === 422) {
        const violations = result.response.data?.violations || []
        distributionErrors.value = {
          ...distributionErrors.value,
          [learningResultId]: violations.map((violation) => violation.message)
        }
      }
      distributionForm.value = { ...distributionForm.value, [learningResultId]: current }
      return
    }
  } finally {
    distributionLoadingByLR.value = {
      ...distributionLoadingByLR.value,
      [learningResultId]: false
    }
  }
}

const canSelectModuleForCourse = (module, courseLevel) => {
  if (!module || isProjectModule(module)) return false
  const targetLevel = Number(courseLevel)
  const moduleLevel = Number(module.courseLevel || 1)
  return [1, 2].includes(targetLevel) && moduleLevel === targetLevel
}

const normalizeSupportLearningResultIds = (orientation) => {
  const ids = [
    ...(orientation?.supportLearningResultIds || []),
    ...(orientation?.orientations?.supportLearningResultIds || []),
    ...((orientation?.supportLearningResults || []).map((learningResult) => learningResult?.id).filter(Boolean))
  ]
  return [...new Set(ids)]
    .map((idValue) => Number(idValue))
    .filter((idValue) => !Number.isNaN(idValue))
}

const orientationsRaw = computed(() => {
  return asArray(
    pcc.value?.intermodularProjectModuleOrientations ||
      guide.value?.intermodularProjectModuleOrientations ||
      guide.value?.orientations ||
      []
  )
})

const normalizedOrientations = computed(() => {
  return orientationsRaw.value
    .map((orientation) => {
      const moduleCode = orientation?.module?.code || orientation?.moduleCode
      const courseLevel = Number(orientation?.courseLevel)
      const supportLearningResultIds = normalizeSupportLearningResultIds(orientation)
      if (!moduleCode || ![1, 2].includes(courseLevel)) return null

      const module = getModuleByCode(moduleCode) || orientation.module || { code: moduleCode }
      const supportLearningResults = supportLearningResultIds.map((idValue) => {
        return (
          (module.learningResults || []).find((learningResult) => learningResult.id === idValue) ||
          { id: idValue }
        )
      })

      return {
        ...orientation,
        moduleCode,
        module,
        courseLevel,
        supportActivitiesGuidance:
          orientation?.supportActivitiesGuidance || orientation?.orientations?.supportActivitiesGuidance || '',
        supportLearningResultIds,
        supportLearningResults
      }
    })
    .filter(Boolean)
})

const participantsRaw = computed(() => {
  const collections = [
    asArray(pcc.value?.intermodularProjectParticipatingModules),
    asArray(pcc.value?.intermodularProjectParticipants),
    asArray(guide.value?.intermodularProjectParticipatingModules),
    asArray(guide.value?.intermodularProjectParticipants),
    asArray(guide.value?.participatingModules),
    asArray(guide.value?.participants)
  ]

  const list = []
  const seen = new Set()
  collections.flat().forEach((participant) => {
    const moduleCode = participant?.module?.code || participant?.moduleCode
    const courseLevel = Number(
      participant?.courseLevel ||
        participant?.module?.courseLevel ||
        getModuleByCode(moduleCode)?.courseLevel
    )
    if (!moduleCode || ![1, 2].includes(courseLevel)) return
    const key = `${moduleCode}-${courseLevel}`
    if (seen.has(key)) return
    seen.add(key)
    list.push(participant)
  })

  return list
})

const derivedParticipants = computed(() => {
  const list = []
  const seen = new Set()
  participantsRaw.value.forEach((participant) => {
    const moduleCode = participant?.module?.code || participant?.moduleCode
    const courseLevel = Number(
      participant?.courseLevel ||
        participant?.module?.courseLevel ||
        getModuleByCode(moduleCode)?.courseLevel
    )
    if (!moduleCode || ![1, 2].includes(courseLevel)) return
    const key = `${moduleCode}-${courseLevel}`
    if (seen.has(key)) return
    seen.add(key)
    list.push({
      moduleCode,
      module: getModuleByCode(moduleCode) || participant?.module || { code: moduleCode },
      courseLevel
    })
  })

  normalizedOrientations.value.forEach((orientation) => {
    const key = `${orientation.moduleCode}-${orientation.courseLevel}`
    if (seen.has(key)) return
    seen.add(key)
    list.push({
      moduleCode: orientation.moduleCode,
      module: orientation.module,
      courseLevel: orientation.courseLevel
    })
  })

  return list
})

const participants = computed(() => {
  return derivedParticipants.value.filter((participant) => {
    const key = `${participant.moduleCode}-${participant.courseLevel}`
    return participantVisibilityOverrides.value[key] !== false
  })
})

const participantsByCourse = computed(() => {
  const grouped = { 1: [], 2: [] }
  participants.value.forEach((participant) => {
    if (grouped[participant.courseLevel]) grouped[participant.courseLevel].push(participant)
  })
  grouped[1].sort((a, b) => a.moduleCode.localeCompare(b.moduleCode))
  grouped[2].sort((a, b) => a.moduleCode.localeCompare(b.moduleCode))
  return grouped
})

const getEligibleSupportModules = (courseLevel) => {
  return (pcc.value?.modules || [])
    .filter(Boolean)
    .map((module) => getModuleByCode(module.code) || module)
    .filter((module) => canSelectModuleForCourse(module, courseLevel))
    .sort((a, b) => a.code.localeCompare(b.code))
}

const getAvailableParticipantModules = (courseLevel) => {
  const used = new Set(participantsByCourse.value[courseLevel].map((participant) => participant.moduleCode))
  return getEligibleSupportModules(courseLevel).filter((module) => !used.has(module.code))
}

const getOrientationForParticipant = (moduleCode, courseLevel) => {
  return (
    normalizedOrientations.value.find(
      (orientation) => orientation.moduleCode === moduleCode && orientation.courseLevel === courseLevel
    ) || null
  )
}

const hasOrientationDetails = (orientation) => {
  if (!orientation) return false
  const hasGuidance = !!orientation.supportActivitiesGuidance?.trim()
  const hasSupport = (orientation.supportLearningResultIds || []).length > 0
  return hasGuidance && hasSupport
}

const getOrientationKey = (orientation) => {
  if (!orientation) return ''
  return `${orientation.moduleCode}-${orientation.courseLevel}`
}

const getSupportLearningResultLabels = (orientation) => {
  return (orientation?.supportLearningResults || []).map((learningResult) => {
    if (learningResult?.number) return `RA${learningResult.number}`
    return `RA#${learningResult?.id || '-'}`
  })
}

const getLearningResultLabel = (learningResult) => {
  if (!learningResult) return 'RA'
  if (learningResult.number) return `RA${learningResult.number}`
  return `RA#${learningResult.id || '-'}`
}

const initTempForm = () => {
  const firstCourseGuide = guide.value?.firstCourseGuide || guide.value?.firstCourse
  const secondCourseGuide = guide.value?.secondCourseGuide || guide.value?.secondCourse
  tempForm.generalOrientations = guide.value?.generalOrientations || ''

  tempForm.firstCourse.temporalizationOption = firstCourseGuide?.temporalizationOption || ''
  tempForm.firstCourse.temporalizationDetails = firstCourseGuide?.temporalizationDetails || ''
  tempForm.firstCourse.weight = firstCourseGuide?.weight ?? null

  tempForm.secondCourse.temporalizationOption = secondCourseGuide?.temporalizationOption || ''
  tempForm.secondCourse.temporalizationDetails = secondCourseGuide?.temporalizationDetails || ''
  tempForm.secondCourse.weight = secondCourseGuide?.weight ?? null

  if (singleProjectCourseLevel.value === 1) {
    tempForm.firstCourse.weight = 100
    tempForm.secondCourse.weight = null
  }
  if (singleProjectCourseLevel.value === 2) {
    tempForm.secondCourse.weight = 100
    tempForm.firstCourse.weight = null
  }
}

watch(
  guide,
  () => {
    initTempForm()
  },
  { immediate: true }
)

watch(singleProjectCourseLevel, () => {
  if (singleProjectCourseLevel.value === 1) {
    tempForm.firstCourse.weight = 100
    tempForm.secondCourse.weight = null
  }
  if (singleProjectCourseLevel.value === 2) {
    tempForm.secondCourse.weight = 100
    tempForm.firstCourse.weight = null
  }
})

const weightTotal = computed(() => {
  return availableProjectCourses.value.reduce((total, courseLevel) => {
    const form = courseLevel === 1 ? tempForm.firstCourse : tempForm.secondCourse
    return total + Number(form.weight || 0)
  }, 0)
})

const saveGuide = async () => {
  resetValidationErrors()
  isSavingGuide.value = true
  try {
    const data = {}
    data.generalOrientations = tempForm.generalOrientations
    if (hasProjectCourse1.value) {
      data.firstCourse = {
        temporalizationOption: tempForm.firstCourse.temporalizationOption,
        temporalizationDetails: tempForm.firstCourse.temporalizationDetails,
        weight: singleProjectCourseLevel.value === 1 ? 100 : tempForm.firstCourse.weight
      }
    }
    if (hasProjectCourse2.value) {
      data.secondCourse = {
        temporalizationOption: tempForm.secondCourse.temporalizationOption,
        temporalizationDetails: tempForm.secondCourse.temporalizationDetails,
        weight: singleProjectCourseLevel.value === 2 ? 100 : tempForm.secondCourse.weight
      }
    }

    const result = await savePCCIntermodularGuide(props.pccId, data)
    if (result === 'ok') {
      initTempForm()
      return
    }
    if (result?.response?.status === 422) {
      const nextErrors = {}
      ;(result.response.data?.violations || []).forEach((violation) => {
        if (!nextErrors[violation.propertyPath]) nextErrors[violation.propertyPath] = []
        nextErrors[violation.propertyPath].push(violation.message)
      })
      validationErrors.value = nextErrors
    }
  } finally {
    isSavingGuide.value = false
  }
}

const addParticipant = async (courseLevel) => {
  resetParticipantErrors(courseLevel)
  const moduleCode = participantSelectorByCourse[courseLevel]
  if (!moduleCode) return
  const module = getModuleByCode(moduleCode)
  if (!canSelectModuleForCourse(module, courseLevel)) return

  participantLoadingKey.value = `${moduleCode}-${courseLevel}`
  try {
    const result = await savePCCIntermodularParticipant(
      props.pccId,
      {
        moduleCode,
        courseLevel: Number(courseLevel)
      },
      {
        showSuccessMessage: false
      }
    )
    if (result === 'ok') {
      participantVisibilityOverrides.value = {
        ...participantVisibilityOverrides.value,
        [`${moduleCode}-${Number(courseLevel)}`]: true
      }
      addMessage(
        'success',
        `El módulo ${getModuleLabel(moduleCode)} contribuye al proyecto intermodular en el curso ${getCourseLabel(courseLevel)}`
      )
      participantSelectorByCourse[courseLevel] = ''
      return
    }
    if (result?.response?.status === 422) {
      const violations = result.response.data?.violations || []
      participantErrors.value = {
        ...participantErrors.value,
        [courseLevel]: violations.map((violation) => violation.message)
      }
      return
    }
    participantErrors.value = {
      ...participantErrors.value,
      [courseLevel]: ['No s\'ha pogut afegir el mòdul de suport.']
    }
  } finally {
    participantLoadingKey.value = ''
  }
}

const removeParticipant = async (participant) => {
  const { moduleCode, courseLevel } = participant
  if (!moduleCode || !courseLevel) return
  resetParticipantErrors(courseLevel)
  if (!confirm(`Segur que vols treure ${getModuleLabel(moduleCode)} de ${getCourseLabel(courseLevel)}?`)) return

  participantLoadingKey.value = `${moduleCode}-${courseLevel}`
  try {
    const ok = await deletePCCIntermodularParticipant(props.pccId, moduleCode, courseLevel, {
      showSuccessMessage: false
    })
    if (!ok) {
      participantErrors.value = {
        ...participantErrors.value,
        [courseLevel]: ["No s'ha pogut eliminar el mòdul participant."]
      }
      return
    }
    participantVisibilityOverrides.value = {
      ...participantVisibilityOverrides.value,
      [`${moduleCode}-${Number(courseLevel)}`]: false
    }
    addMessage(
      'success',
      `El módulo ${getModuleLabel(moduleCode)} ya no contribuye al proyecto intermodular en el curso ${getCourseLabel(courseLevel)}`
    )
  } finally {
    participantLoadingKey.value = ''
  }
}

const openOrientationModal = (participant, orientation = null) => {
  resetOrientationErrors()
  orientationForm.moduleCode = participant.moduleCode
  orientationForm.moduleName = participant.module?.name || getModuleByCode(participant.moduleCode)?.name || ''
  orientationForm.courseLevel = participant.courseLevel
  orientationForm.supportLearningResultIds = orientation?.supportLearningResultIds
    ? [...orientation.supportLearningResultIds]
    : []
  orientationForm.supportActivitiesGuidance = orientation?.supportActivitiesGuidance || ''
  showOrientationModal.value = true
}

const closeOrientationModal = () => {
  showOrientationModal.value = false
  resetOrientationErrors()
  orientationForm.moduleCode = ''
  orientationForm.moduleName = ''
  orientationForm.courseLevel = null
  orientationForm.supportLearningResultIds = []
  orientationForm.supportActivitiesGuidance = ''
}

const availableSupportLearningResults = computed(() => {
  const module = getModuleByCode(orientationForm.moduleCode)
  return module?.learningResults || []
})

const selectedSupportLearningResults = computed(() => {
  const selected = new Set((orientationForm.supportLearningResultIds || []).map((idValue) => Number(idValue)))
  return availableSupportLearningResults.value.filter((learningResult) => selected.has(learningResult.id))
})

const saveOrientation = async () => {
  resetOrientationErrors()

  const module = getModuleByCode(orientationForm.moduleCode)
  const selectedSupportIds = [...new Set((orientationForm.supportLearningResultIds || []).map(Number))].filter(
    (idValue) => !Number.isNaN(idValue)
  )

  if (!orientationForm.moduleCode || !orientationForm.courseLevel) {
    orientationErrors.value = { moduleCode: ['Selecciona un mòdul de suport.'] }
    return
  }
  if (!canSelectModuleForCourse(module, orientationForm.courseLevel)) {
    orientationErrors.value = { moduleCode: ['El mòdul seleccionat no és elegible per al curs objectiu.'] }
    return
  }
  if (selectedSupportIds.length === 0) {
    orientationErrors.value = { supportLearningResultIds: ['Selecciona almenys un RA de suport.'] }
    return
  }
  if (!orientationForm.supportActivitiesGuidance.trim()) {
    orientationErrors.value = { supportActivitiesGuidance: ["L'orientació és obligatòria."] }
    return
  }

  const moduleLearningResultIds = new Set((module?.learningResults || []).map((learningResult) => learningResult.id))
  if (selectedSupportIds.some((idValue) => !moduleLearningResultIds.has(idValue))) {
    orientationErrors.value = { supportLearningResultIds: ['Hi ha RA que no pertanyen al mòdul seleccionat.'] }
    return
  }

  isSavingOrientation.value = true
  try {
    const result = await savePCCIntermodularOrientation(props.pccId, {
      moduleCode: orientationForm.moduleCode,
      courseLevel: Number(orientationForm.courseLevel),
      orientations: {
        supportLearningResultIds: selectedSupportIds,
        supportActivitiesGuidance: orientationForm.supportActivitiesGuidance.trim()
      }
    })
    if (result === 'ok') {
      closeOrientationModal()
      return
    }
    if (result?.response?.status === 422) {
      const nextErrors = {}
      ;(result.response.data?.violations || []).forEach((violation) => {
        if (!nextErrors[violation.propertyPath]) nextErrors[violation.propertyPath] = []
        nextErrors[violation.propertyPath].push(violation.message)
      })
      orientationErrors.value = nextErrors
      return
    }
    const backendErrorMessage =
      result?.response?.data?.detail ||
      result?.response?.data?.message ||
      result?.response?.data?.title ||
      "No s'ha pogut guardar l'orientació."
    orientationErrors.value = { moduleCode: [backendErrorMessage] }
  } finally {
    isSavingOrientation.value = false
  }
}

const deleteOrientation = async (orientation) => {
  if (!orientation) return
  if (!confirm(`Segur que vols eliminar l'orientació de ${getModuleLabel(orientation.moduleCode)}?`)) return
  deletingOrientationKey.value = getOrientationKey(orientation)
  try {
    await deletePCCIntermodularOrientation(props.pccId, orientation.moduleCode, orientation.courseLevel)
  } finally {
    deletingOrientationKey.value = ''
  }
}
</script>

<template>
  <div class="pcc-intermodular-guide">
    <div class="card mb-3">
      <div class="card-header pcc fw-bold text-uppercase text-white text-start">
        8.1 Temporalització i pes del Projecte Intermodular
      </div>
      <div class="card-body">
        <div v-if="availableProjectCourses.length > 0 && weightTotal < 100" class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>
          El pes total dels cursos no arriba al 100%.
        </div>

        <div v-if="availableProjectCourses.length === 0" class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>
          No hi ha mòduls de projecte intermodular en aquest PCC.
        </div>

        <div class="row g-4">
          <div
            v-for="courseLevel in availableProjectCourses"
            :key="`temporalization-${courseLevel}`"
            :class="availableProjectCourses.length === 2 ? 'col-12 col-lg-6' : 'col-12'"
          >
            <div class="card h-100">
              <div class="card-header bg-secondary text-white fw-bold">
                Projecte Intermodular - {{ getCourseLabel(courseLevel) }}
              </div>
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label fw-bold">Temporalització</label>
                  <select
                    v-model="getCourseForm(courseLevel).temporalizationOption"
                    :class="[
                      'form-select',
                      {
                        'is-invalid': hasFieldError(
                          `${getFieldPrefix(courseLevel)}.temporalizationOption`
                        )
                      }
                    ]"
                  >
                    <option value="">-- Selecciona --</option>
                    <option v-for="option in tempOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-bold">Observacions sobre la temporalització</label>
                  <textarea
                    v-model="getCourseForm(courseLevel).temporalizationDetails"
                    class="form-control"
                    rows="3"
                  ></textarea>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-bold">Pes (%)</label>
                  <div class="form-text" v-if="singleProjectCourseLevel === courseLevel">
                    En projecte d'un sol curs, el pes és sempre del 100%.
                  </div>
                  <input
                    type="number"
                    v-model.number="getCourseForm(courseLevel).weight"
                    class="form-control"
                    min="0"
                    max="100"
                    :disabled="singleProjectCourseLevel === courseLevel"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="availableProjectCourses.length > 0" class="text-end mt-3">
          <button @click="saveGuide" class="btn btn-success" :disabled="isSavingGuide">
            <span v-if="isSavingGuide" class="spinner-border spinner-border-sm me-1"></span>
            Guardar temporalització
          </button>
        </div>
      </div>
    </div>

    <div class="card mb-3" v-if="projectLearningResults.length > 0">
      <div class="card-header pcc fw-bold text-uppercase text-white text-start">
        8.2 Distribució RA de mòduls de projecte per curs
      </div>
      <div class="card-body">
        <div v-if="!hasProjectInBothCourses" class="alert alert-info mb-0">
          El projecte està en <strong>{{ getCourseLabel(singleProjectCourseLevel) }}</strong>.
          La distribució de RA és informativa.
        </div>

        <div class="row g-3 mb-3">
          <div v-if="hasProjectCourse1" :class="hasProjectInBothCourses ? 'col-12 col-lg-6' : 'col-12'">
            <div class="course-block course-block-1">
              <strong>1r curs:</strong>
              <span class="ms-1">{{ learningResultsByCourse[1].map((lr) => `RA${lr.number}`).join(', ') }}</span>
            </div>
          </div>
          <div v-if="hasProjectCourse2" :class="hasProjectInBothCourses ? 'col-12 col-lg-6' : 'col-12'">
            <div class="course-block course-block-2">
              <strong>2n curs:</strong>
              <span class="ms-1">{{ learningResultsByCourse[2].map((lr) => `RA${lr.number}`).join(', ') }}</span>
            </div>
          </div>
        </div>

        <div v-if="hasProjectInBothCourses" class="table-responsive">
          <table class="table table-sm table-bordered align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 80px">RA</th>
                <th>Descriptor</th>
                <th style="width: 100px">1r</th>
                <th style="width: 100px">2n</th>
                <th style="width: 250px">Distribució</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="learningResult in projectLearningResults" :key="learningResult.id">
                <td class="fw-bold">RA{{ learningResult.number }}</td>
                <td class="small">{{ learningResult.descriptor }}</td>
                <td class="text-center">
                  <i
                    :class="
                      getActiveCourseLevelsForLearningResult(learningResult.id).includes(1)
                        ? 'bi bi-check-circle-fill text-primary'
                        : 'bi bi-dash-circle text-muted'
                    "
                  ></i>
                </td>
                <td class="text-center">
                  <i
                    :class="
                      getActiveCourseLevelsForLearningResult(learningResult.id).includes(2)
                        ? 'bi bi-check-circle-fill text-success'
                        : 'bi bi-dash-circle text-muted'
                    "
                  ></i>
                </td>
                <td>
                  <div class="btn-group btn-group-sm" :data-testid="`distribution-switch-${learningResult.id}`">
                    <button
                      type="button"
                      class="btn"
                      :class="isDistributionOptionSelected(learningResult.id, '1') ? 'btn-primary' : 'btn-outline-primary'"
                      :disabled="distributionLoadingByLR[learningResult.id]"
                      :data-testid="`distribution-option-${learningResult.id}-1`"
                      @click="saveLearningResultDistribution(learningResult.id, getDistributionOptionCourseLevels('1'))"
                    >
                      1r
                    </button>
                    <button
                      type="button"
                      class="btn"
                      :class="isDistributionOptionSelected(learningResult.id, '2') ? 'btn-success' : 'btn-outline-success'"
                      :disabled="distributionLoadingByLR[learningResult.id]"
                      :data-testid="`distribution-option-${learningResult.id}-2`"
                      @click="saveLearningResultDistribution(learningResult.id, getDistributionOptionCourseLevels('2'))"
                    >
                      2n
                    </button>
                    <button
                      type="button"
                      class="btn"
                      :class="isDistributionOptionSelected(learningResult.id, '1-2') ? 'btn-dark' : 'btn-outline-dark'"
                      :disabled="distributionLoadingByLR[learningResult.id]"
                      :data-testid="`distribution-option-${learningResult.id}-both`"
                      @click="saveLearningResultDistribution(learningResult.id, getDistributionOptionCourseLevels('1-2'))"
                    >
                      1r + 2n
                    </button>
                  </div>
                  <div v-if="hasDistributionError(learningResult.id)" class="text-danger small mt-1">
                    <div v-for="(message, index) in getDistributionErrors(learningResult.id)" :key="index">
                      {{ message }}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header pcc fw-bold text-uppercase text-white text-start">
        8.3 Mòduls participants per curs
      </div>
      <div class="card-body">
        <template v-for="courseLevel in availableProjectCourses" :key="`participants-${courseLevel}`">
          <div class="course-block mb-3" :class="courseLevel === 1 ? 'course-block-1' : 'course-block-2'">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0 fw-bold">Participants {{ getCourseLabel(courseLevel) }}</h5>
              <span class="badge" :class="courseLevel === 1 ? 'text-bg-primary' : 'text-bg-success'">
                {{ participantsByCourse[courseLevel].length }} mòduls
              </span>
            </div>

            <div class="row g-2 mb-2">
              <div class="col-12 col-lg-8">
                <select
                  v-model="participantSelectorByCourse[courseLevel]"
                  class="form-select"
                  :data-testid="`participant-select-${courseLevel}`"
                  :disabled="getAvailableParticipantModules(courseLevel).length === 0"
                >
                  <option value="">
                    {{
                      getAvailableParticipantModules(courseLevel).length > 0
                        ? 'Selecciona un mòdul suport'
                        : 'No queden mòduls per afegir'
                    }}
                  </option>
                  <option
                    v-for="module in getAvailableParticipantModules(courseLevel)"
                    :key="module.code"
                    :value="module.code"
                  >
                    {{ module.code }} - {{ module.name }} ({{ getCourseLabel(module.courseLevel) }})
                  </option>
                </select>
              </div>
              <div class="col-12 col-lg-4 d-grid">
                <button
                  class="btn btn-outline-primary"
                  :data-testid="`add-participant-${courseLevel}`"
                  :disabled="
                    getAvailableParticipantModules(courseLevel).length === 0 ||
                    !participantSelectorByCourse[courseLevel] ||
                    participantLoadingKey === `${participantSelectorByCourse[courseLevel]}-${courseLevel}`
                  "
                  @click="addParticipant(courseLevel)"
                >
                  Afegir Mòdul
                </button>
              </div>
            </div>

            <div v-if="hasParticipantErrors(courseLevel)" class="alert alert-danger small py-2 mb-2">
              <div v-for="(message, index) in getParticipantErrors(courseLevel)" :key="`participant-error-${courseLevel}-${index}`">
                {{ message }}
              </div>
            </div>

            <div
              v-if="getAvailableParticipantModules(courseLevel).length === 0"
              class="alert alert-light border small py-2 mb-2"
            >
              Ja has afegit tots els mòduls elegibles per a {{ getCourseLabel(courseLevel) }}.
            </div>

            <div v-if="participantsByCourse[courseLevel].length === 0" class="text-muted small fst-italic">
              Encara no hi ha mòduls participants per a {{ getCourseLabel(courseLevel) }}.
            </div>

            <div v-else class="d-flex flex-wrap gap-2">
              <div
                v-for="participant in participantsByCourse[courseLevel]"
                :key="`${participant.moduleCode}-${participant.courseLevel}`"
                class="badge participant-badge d-inline-flex align-items-center"
              >
                <span>{{ getModuleLabel(participant.moduleCode) }}</span>
                <button
                  type="button"
                  class="btn btn-link btn-sm text-danger p-0 ms-2"
                  :disabled="participantLoadingKey === `${participant.moduleCode}-${participant.courseLevel}`"
                  :data-testid="`remove-participant-${participant.courseLevel}-${participant.moduleCode}`"
                  @click="removeParticipant(participant)"
                >
                  <i class="bi bi-x-circle-fill"></i>
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header pcc fw-bold text-uppercase text-white text-start">
        8.4 Orientació única per mòdul participant i curs
      </div>
      <div class="card-body">
        <div v-if="orientationsRaw.length > 0 && normalizedOrientations.length === 0" class="alert alert-warning">
          S'han detectat orientacions del model antic i no es mostren.
        </div>

        <div class="row g-3">
          <template v-for="courseLevel in availableProjectCourses" :key="`orientation-course-${courseLevel}`">
            <div :class="hasProjectInBothCourses ? 'col-12 col-xl-6' : 'col-12'">
              <div class="course-block h-100" :class="courseLevel === 1 ? 'course-block-1' : 'course-block-2'">
                <h5 class="fw-bold mb-2">Orientacions {{ getCourseLabel(courseLevel) }}</h5>
                <div v-if="participantsByCourse[courseLevel].length === 0" class="text-muted small fst-italic mb-2">
                  Primer afegeix participants en aquest curs.
                </div>

                <div
                  v-for="participant in participantsByCourse[courseLevel]"
                  :key="`orientation-${participant.moduleCode}-${participant.courseLevel}`"
                  class="card mb-2"
                >
                  <div class="card-header d-flex justify-content-between align-items-center">
                    <span class="fw-semibold">{{ getModuleLabel(participant.moduleCode) }}</span>
                    <div
                      v-if="hasOrientationDetails(getOrientationForParticipant(participant.moduleCode, participant.courseLevel))"
                      class="d-flex gap-2"
                    >
                      <button
                        class="btn btn-sm btn-primary"
                        :data-testid="`edit-orientation-${courseLevel}-${participant.moduleCode}`"
                        @click="openOrientationModal(participant, getOrientationForParticipant(participant.moduleCode, participant.courseLevel))"
                      >
                        Editar orientació
                      </button>
                      <button
                        class="btn btn-sm btn-danger"
                        :disabled="
                          deletingOrientationKey ===
                          getOrientationKey(getOrientationForParticipant(participant.moduleCode, participant.courseLevel))
                        "
                        @click="
                          deleteOrientation(getOrientationForParticipant(participant.moduleCode, participant.courseLevel))
                        "
                      >
                        Eliminar orientació
                      </button>
                    </div>
                  </div>
                  <div class="card-body p-2">
                    <div v-if="hasOrientationDetails(getOrientationForParticipant(participant.moduleCode, participant.courseLevel))">
                      <div class="small mb-1">
                        <strong>RA activats:</strong>
                        <span
                          v-for="label in getSupportLearningResultLabels(
                            getOrientationForParticipant(participant.moduleCode, participant.courseLevel)
                          )"
                          :key="`${participant.moduleCode}-${participant.courseLevel}-${label}`"
                          class="badge text-bg-light border ms-1"
                        >
                          {{ label }}
                        </span>
                      </div>
                      <div class="text-muted small mb-2">
                        {{
                          getOrientationForParticipant(participant.moduleCode, participant.courseLevel)
                            .supportActivitiesGuidance
                        }}
                      </div>
                    </div>
                     <div v-else class="text-muted small fst-italic">
                       Mòdul afegit sense orientació completa.
                       <div class="mt-2">
                         <button
                           class="btn btn-sm btn-outline-primary"
                           :data-testid="`add-orientation-${courseLevel}-${participant.moduleCode}`"
                           @click="openOrientationModal(participant, getOrientationForParticipant(participant.moduleCode, participant.courseLevel))"
                         >
                           Afegir orientació
                         </button>
                       </div>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header pcc fw-bold text-uppercase text-white text-start">8.5 Altres Orientacions</div>
      <div class="card-body">
        <div class="alert alert-info mb-3">
          <i class="bi bi-info-circle-fill me-2"></i>
          <strong>(opcional)</strong> Ací pots incloure orientacions generals del projecte intermodular,
          com ara:
          requisits per a la matriculació, línies generals per a la defensa del projecte, distribució
          de les tutories individuals, criteris per a la creació de grups, la necessitat d'avaluació
          individual i grupal...
        </div>
        <ckeditor
          class="w-100"
          :editor="editor"
          v-model="tempForm.generalOrientations"
          :config="editorConfig"
        />
      </div>
      <div class="card-footer text-end">
        <button @click="saveGuide" class="btn btn-success" :disabled="isSavingGuide">
          <span v-if="isSavingGuide" class="spinner-border spinner-border-sm me-1"></span>
          Guardar altres orientacions
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showOrientationModal">
        <div class="modal d-block" tabindex="-1">
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-primary text-white">
                <h5 class="modal-title">Orientació de mòdul</h5>
                <button type="button" class="btn-close btn-close-white" @click="closeOrientationModal"></button>
              </div>
              <div class="modal-body">
                <p class="text-muted mb-2">
                  <strong>Mòdul:</strong> {{ getModuleLabel(orientationForm.moduleCode) }}
                </p>
                <p class="text-muted mb-3"><strong>Curs:</strong> {{ getCourseLabel(orientationForm.courseLevel) }}</p>

                <div class="alert alert-light border small py-2">
                  <div class="mb-1">
                    <strong>RA seleccionats</strong>
                  </div>
                  <div v-if="selectedSupportLearningResults.length === 0" class="text-muted fst-italic">
                    Cap RA seleccionat.
                  </div>
                  <div v-else>
                    <span
                      v-for="learningResult in selectedSupportLearningResults"
                      :key="`selected-ra-${learningResult.id}`"
                      class="badge text-bg-light border ms-1"
                    >
                      {{ getLearningResultLabel(learningResult) }}
                    </span>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-bold">RA de suport</label>
                  <div
                    :class="[
                      'selection-box',
                      {
                        'is-invalid': hasOrientationError('supportLearningResultIds')
                      }
                    ]"
                  >
                    <div
                      v-for="learningResult in availableSupportLearningResults"
                      :key="`support-learning-result-${learningResult.id}`"
                      class="form-check mb-1"
                    >
                      <input
                        :id="`support-learning-result-${learningResult.id}`"
                        v-model="orientationForm.supportLearningResultIds"
                        class="form-check-input"
                        type="checkbox"
                        :value="learningResult.id"
                      />
                      <label class="form-check-label" :for="`support-learning-result-${learningResult.id}`">
                        {{ getLearningResultLabel(learningResult) }} - {{ learningResult.descriptor || '-' }}
                      </label>
                    </div>
                  </div>
                  <div v-if="hasOrientationError('supportLearningResultIds')" class="invalid-feedback d-block">
                    <div
                      v-for="(message, index) in getOrientationErrors('supportLearningResultIds')"
                      :key="`support-${index}`"
                    >
                      {{ message }}
                    </div>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-bold">Orientació (obligatori)</label>
                  <div class="orientation-help-box mb-2">
                    <div class="orientation-help-title">
                      <i class="bi bi-info-circle-fill me-2"></i>
                      Ajuda per redactar l'orientació
                    </div>
                    <div class="small mb-1">
                      Indica com pot contribuir aquest mòdul al projecte intermodular i quines orientacions cal
                      tenir en compte per desenvolupar els reptes a partir dels RA seleccionats.
                    </div>
                    <div class="orientation-help-example small mb-0">
                      <span class="orientation-help-example-label">Exemple orientatiu</span>
                      Aquest mòdul contribuirà al projecte intermodular mitjançant activitats orientades a
                      identificar necessitats, aplicar protocols d'actuació i verificar resultats. L'alumnat haurà
                      d'evidenciar autonomia en l'execució, capacitat d'adaptació davant d'incidències i coherència
                      entre les decisions preses i les activitats plantejades.
                    </div>
                  </div>
                  <textarea
                    v-model="orientationForm.supportActivitiesGuidance"
                    :class="['form-control', { 'is-invalid': hasOrientationError('supportActivitiesGuidance') }]"
                    rows="6"
                    placeholder="Exemple: descriu com aquest mòdul pot intervenir en el repte: protocols, actuacions, materials, situacions pràctiques o criteris que s'hauran d'evidenciar."
                  ></textarea>
                  <div v-if="hasOrientationError('supportActivitiesGuidance')" class="invalid-feedback d-block">
                    <div
                      v-for="(message, index) in getOrientationErrors('supportActivitiesGuidance')"
                      :key="index"
                    >
                      {{ message }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" @click="closeOrientationModal">Cancel·lar</button>
                <button
                  class="btn btn-primary"
                  :disabled="
                    isSavingOrientation ||
                    orientationForm.supportLearningResultIds.length === 0 ||
                    !orientationForm.supportActivitiesGuidance.trim()
                  "
                  @click="saveOrientation"
                >
                  <span v-if="isSavingOrientation" class="spinner-border spinner-border-sm me-1"></span>
                  Guardar orientació
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show" @click="closeOrientationModal"></div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.course-block {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.75rem;
  background: #f8fafc;
}

.course-block-1 {
  border-left: 4px solid #0d6efd;
}

.course-block-2 {
  border-left: 4px solid #198754;
}

.participant-badge {
  background: #edf2f7;
  color: #1f2937;
  border: 1px solid #d1d5db;
  padding: 0.4rem 0.55rem;
  display: inline-flex;
  align-items: center;
}

.selection-box {
  border: 0;
  border-radius: 0;
  padding: 0;
  max-height: 220px;
  overflow: auto;
  background: transparent;
}

.selection-box.is-invalid {
  border-color: #dc3545;
}

.criteria-group {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: #f8fafc;
  overflow: hidden;
  margin-bottom: 0.45rem;
}

.criteria-group-title {
  cursor: pointer;
  font-weight: 600;
  padding: 0.45rem 0.65rem;
  background: #eaf2ff;
  list-style: none;
}

.criteria-group-title::-webkit-details-marker {
  display: none;
}

.criteria-group-title::before {
  content: '▸';
  color: #0b3d91;
  margin-right: 0;
}

.criteria-group[open] .criteria-group-title::before {
  content: '▾';
}

.criteria-group-title-text {
  color: #0b3d91;
}

.criteria-group-title-desc {
  margin-left: 0.35rem;
  color: #4b5563;
  font-weight: 500;
}

.criteria-group[open] .criteria-group-title {
  border-bottom: 1px solid #dbe7ff;
}

.criteria-group > div {
  padding: 0.55rem 0.65rem 0.65rem;
}

.criteria-group-active {
  border-color: #0d6efd;
}

.criteria-group-active .criteria-group-title {
  background: #d8e8ff;
}

.orientation-help-box {
  border: 1px solid #b7d4fe;
  border-radius: 0.5rem;
  background: #eef5ff;
  padding: 0.65rem 0.75rem;
}

.orientation-help-title {
  font-weight: 700;
  color: #0b3d91;
  margin-bottom: 0.35rem;
}

.orientation-help-example {
  border-left: 3px solid #7aa2e3;
  background: #f8fbff;
  padding: 0.45rem 0.55rem;
  border-radius: 0.35rem;
}

.orientation-help-example-label {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #355fa3;
  margin-right: 0.35rem;
}

:deep(.ck-editor__editable_inline) {
  min-height: 220px;
}
</style>
