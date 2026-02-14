<script>
import { mapState } from 'pinia'
import { useDataStore } from '../stores/data'

export default {
  computed: {
    ...mapState(useDataStore, ['syllabus', 'pcc']),
    isHiddenRoute() {
      return (
        this.$route.name === 'login' ||
        this.$route.name === 'loginIntranet' ||
        this.$route.name === 'viewSyllabus'
      )
    },
    editingSyllabusRoutes() {
      return [
        'contextSyl',
        'LSsDefine',
        'LSTest',
        'LSsDevelopment',
        'LSDevelop',
        'SyllabusSchedule',
        'SyllabusQualify',
        'FinalQualify',
        'MethodologicalPrinciples',
        'ValidateSyllabus'
      ]
    },
    editingProposalRoutes() {
      return ['imprProp']
    },
    managingSyllabusesRoutes() {
      return ['SyllabusesManage']
    },
    editingPccRoutes() {
      return [
        'contextPCC',
        'focusPCC',
        'modulesPCC',
        'assessmentToolsPCC',
        'trainingPlanPCC',
        'centerProjectsPCC',
        'criteriaPCC',
        'intermodularPCC'
      ]
    },
    contextName() {
      if (this.editingSyllabusRoutes.includes(this.$route.name)) {
        if (this.syllabus?.module?.name) return this.syllabus.module.name
        if (this.syllabus?.cycle?.shortName) return this.syllabus.cycle.shortName
        if (this.syllabus?.cycle?.name) return this.syllabus.cycle.name
      }

      if (this.editingPccRoutes.includes(this.$route.name)) {
        if (this.pcc?.cycle?.shortName) return this.pcc.cycle.shortName
        if (this.pcc?.cycle?.name) return this.pcc.cycle.name
      }

      return ''
    },
    crumbs() {
      const items = ['Inici']
      if (this.editingProposalRoutes.includes(this.$route.name)) {
        items.push('Editando propuesta didáctica')
      } else if (this.editingSyllabusRoutes.includes(this.$route.name)) {
        items.push('Editando programación')
      } else if (this.managingSyllabusesRoutes.includes(this.$route.name)) {
        items.push('Gestionant Programacions')
      } else if (this.editingPccRoutes.includes(this.$route.name)) {
        items.push('Editant pcc')
      }

      if (this.contextName) {
        items.push(this.contextName)
      }

      return items
    }
  }
}
</script>

<template>
  <nav v-if="!isHiddenRoute" class="breadcrumb-wrapper" aria-label="breadcrumb">
    <ol class="breadcrumb mb-2">
      <li
        v-for="(crumb, index) in crumbs"
        :key="`${crumb}-${index}`"
        class="breadcrumb-item"
        :class="{ active: index === crumbs.length - 1 }"
        :aria-current="index === crumbs.length - 1 ? 'page' : null"
      >
        {{ crumb }}
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb-wrapper {
  margin-top: 10px;
}

.breadcrumb {
  background: transparent;
}
</style>
