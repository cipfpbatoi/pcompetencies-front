<script>
import { mapState } from 'pinia'
import { useDataStore } from '../stores/data'
import LrTable from '../components/LrTable.vue'
import ShowUnits from '../components/ShowUnits.vue'
import ShowBlocks from '../components/ShowBlocks.vue'
import AppBreadcrumb from '../components/AppBreadcrumb.vue'

export default {
  components: {
    AppBreadcrumb,
    LrTable,
    ShowBlocks,
    ShowUnits
  },
  computed: {
    ...mapState(useDataStore, ['syllabus', 'module']),
    done() {
      return !!this.syllabus.learningSituations?.length
    }
  },
  mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
  },
}
</script>

<template>
  <main>
    <app-breadcrumb :actualStep="3" :done="done"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }})</h2>
    <div>
      <show-units :editable="true"></show-units>
    </div>
    <br />
    <div>
      <h3>Resultats d'aprenentatge</h3>
      <Lr-Table :learningResults="module.learningResults"></Lr-Table>
    </div>
    <br />
    <div>
      <h3>Continguts</h3>
      <ShowBlocks></ShowBlocks>
    </div>
  </main>
</template>
