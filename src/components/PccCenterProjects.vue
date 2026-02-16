<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '@/stores/data'

const props = defineProps({
  pccId: {
    type: Number,
    required: true
  }
})

// Store
const store = useDataStore()
const { pcc } = storeToRefs(store)
const {
  loadCenterProjects,
  loadModuleCenterProjectsCollection,
  loadModuleCenterProjects,
  addModuleCenterProjects,
  removeModuleCenterProject
} = store

// State
const allCenterProjects = ref([])
const moduleCenterProjects = ref({})
const isLoading = ref(false)
const processingCell = ref(null)

// Computeds
const modules = computed(() => pcc.value?.modules || [])

const modulesByCourse = computed(() => {
  const grouped = { 1: [], 2: [] }
  modules.value.forEach((m) => {
    const level = m.courseLevel || 1
    if (grouped[level]) grouped[level].push(m)
  })
  return grouped
})

// Methods
const isChecked = (moduleCode, projectId) => {
  const projects = moduleCenterProjects.value[moduleCode] || []
  return projects.some((p) => p.id === projectId)
}

const getCellKey = (moduleCode, projectId) => `${moduleCode}-${projectId}`

const extractProjectId = (project) => {
  return project?.id || project?.projectId || project?.centerProjectId || null
}

const extractModuleCode = (item) => {
  return (
    item?.moduleCode ||
    item?.module?.code ||
    item?.module?.moduleCode ||
    item?.moduleOrganization?.module?.code ||
    item?.moduleOrganization?.moduleCode ||
    item?.moduleOrganization?.module?.moduleCode ||
    item?.module
  )
}

const extractProject = (item) => {
  if (Array.isArray(item?.centerProjects)) return item.centerProjects
  if (item?.centerProject) return item.centerProject
  if (item?.project) return item.project
  if (item?.centerProjectId || item?.projectId) {
    return { id: item.centerProjectId || item.projectId }
  }
  if (item?.centerProject?.id) return item.centerProject
  return null
}

const buildModuleCenterProjects = (items) => {
  const mapped = {}
  items.forEach((item) => {
    const moduleCode = extractModuleCode(item)
    const project = extractProject(item)
    if (!moduleCode || !project) return
    const projects = Array.isArray(project) ? project : [project]
    projects.forEach((proj) => {
      const projectId = extractProjectId(proj)
      if (!projectId) return
      if (!mapped[moduleCode]) mapped[moduleCode] = []
      if (!mapped[moduleCode].some((p) => p.id === projectId)) {
        mapped[moduleCode].push(proj)
      }
    })
  })
  return mapped
}

const refreshModuleCenterProjects = async () => {
  const relations = await loadModuleCenterProjectsCollection(props.pccId)
  if (relations.length > 0) {
    const mapped = buildModuleCenterProjects(relations)
    moduleCenterProjects.value = modules.value.reduce((acc, module) => {
      acc[module.code] = mapped[module.code] || []
      return acc
    }, {})
    return
  }

  const projectsByModule = await Promise.all(
    modules.value.map(async (module) => {
      const projects = await loadModuleCenterProjects(props.pccId, module.code)
      return { moduleCode: module.code, projects }
    })
  )
  moduleCenterProjects.value = projectsByModule.reduce((acc, entry) => {
    acc[entry.moduleCode] = entry.projects
    return acc
  }, {})
}

const toggleProject = async (module, project) => {
  const cellKey = getCellKey(module.code, project.id)
  if (processingCell.value) return

  processingCell.value = cellKey

  try {
    if (isChecked(module.code, project.id)) {
      const success = await removeModuleCenterProject(props.pccId, module.code, project.id)
      if (success) {
        await refreshModuleCenterProjects()
      }
    } else {
      const success = await addModuleCenterProjects(props.pccId, module.code, [project.id])
      if (success) {
        await refreshModuleCenterProjects()
      }
    }
  } finally {
    processingCell.value = null
  }
}

const loadAllData = async () => {
  isLoading.value = true
  try {
    allCenterProjects.value = await loadCenterProjects()
    await refreshModuleCenterProjects()
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadAllData()
})
</script>

<template>
  <div class="pcc-center-projects">
    <div v-if="isLoading" class="text-center p-4">
      <span class="spinner-border me-2"></span>
      Carregant...
    </div>

    <template v-else-if="allCenterProjects.length > 0 && modules.length > 0">
      <!-- Tabla por curso -->
      <template v-for="course in [1, 2]" :key="course">
        <div v-if="modulesByCourse[course].length > 0" class="card mb-3">
          <div class="card-header bg-secondary text-white fw-bold">
            <i class="bi bi-journal-text me-2"></i>
            {{ course === 1 ? '1r Curs' : '2n Curs' }}
          </div>
          <div class="table-responsive">
            <table class="table table-bordered table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="module-col">Mòdul</th>
                  <th
                    v-for="project in allCenterProjects"
                    :key="project.id"
                    class="text-center project-col"
                    :title="project.name"
                  >
                    <span class="d-inline-block text-truncate project-header">{{
                      project.name
                    }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="module in modulesByCourse[course]" :key="module.code">
                  <td class="module-col">
                    <strong>{{ module.code }}</strong>
                    <span class="d-none d-md-inline"> - {{ module.name }}</span>
                  </td>
                  <td v-for="project in allCenterProjects" :key="project.id" class="text-center">
                    <div class="form-check d-flex justify-content-center m-0">
                      <input
                        class="form-check-input cell-checkbox"
                        type="checkbox"
                        :checked="isChecked(module.code, project.id)"
                        :disabled="processingCell === getCellKey(module.code, project.id)"
                        @change="toggleProject(module, project)"
                      />
                      <span
                        v-if="processingCell === getCellKey(module.code, project.id)"
                        class="spinner-border spinner-border-sm ms-1"
                      ></span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>

    <div v-else class="alert alert-info">
      <i class="bi bi-info-circle me-2"></i>
      No hi ha projectes de centre o mòduls disponibles
    </div>
  </div>
</template>

<style scoped>
.module-col {
  min-width: 150px;
  white-space: nowrap;
}

.project-col {
  min-width: 80px;
}

.project-header {
  max-width: 120px;
  font-size: 0.85rem;
  writing-mode: horizontal-tb;
}

.cell-checkbox {
  width: 1.2em;
  height: 1.2em;
  cursor: pointer;
}

.cell-checkbox:disabled {
  cursor: wait;
}
</style>
