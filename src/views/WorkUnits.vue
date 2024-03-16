<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import LrTable from '../components/LrTable.vue'
import ShowUnits from '../components/ShowUnits.vue'
import ShowBlocks from '../components/ShowBlocks.vue'

export default {
  components: {
    LrTable,
    ShowBlocks,
    ShowUnits,
  },
  computed: {
    ...mapState(useDataStore, ['programming', 'currentModule', 'workUnits', 'learningResults']),
    done() {
      return this.workUnits.length
    }
  },
  mounted() {
    if (!this.programming.id) {
      this.$router.push('/')
    }
  },
  data() {
    return {
      cicle: '',
      module: '',
    }
  },
  methods: {
    ...mapActions(useDataStore, ['loadModules', 'loadModuleInfo']),
    getModules() {
      if (this.cicle) {
        this.loadModules(this.cicle)
      } else {
        this.module = ''
      }
    },
    getLearningResults() {
      if (this.module) {
        this.loadModuleInfo(this.module)
      } 
    }
  }
}
</script>

<template>
  <main>
    <div class="bg-secondary text-white">
      <button @click="$router.push('/')" class="btn btn-sm btn-link">Pas 1: selecciona mòdul</button> -> 
      Pas 2: unitats de treball -> 
      <button @click="$router.push('/test')" :disabled="!done">Següent pas</button>
    </div>
    <h2>{{ currentModule.name }}</h2>
    <div>
      <show-units :units="workUnits" :editable="true" @delete="removeBlock"></show-units>
    </div>
    <br>
    <div>
      <h3>Resultats d'aprenentatge</h3>
      <Lr-Table :learningResults="learningResults"></Lr-Table>
    </div>
    <br>
    <div>
      <h3>Continguts</h3>
      <ShowBlocks></ShowBlocks>
    </div>
  </main>
</template>
