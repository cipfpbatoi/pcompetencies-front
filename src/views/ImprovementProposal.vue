<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'

export default {
  components: {
    AppBreadcrumb,
  },
  computed: {
    ...mapState(useDataStore, ['syllabus'])
  },
  mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
    if (!this.syllabus.improvementProposal) {
      this.done = true
    } else {
      if (this.syllabus.improvementProposal.comments) {
        this.done = true
        this.comments = this.syllabus.improvementProposal.comments
      }
    }
  },
  data() {
    return {
      done: false,
      accepted: this.syllabus?.improvementProposal?.accepted || false,
      comments: this.syllabus?.improvementProposal?.accepted || ''
    }
  },
  methods: {
    ...mapActions(useDataStore, ['evaluateImprovement']),
    async handleForm() {
      if (!this.comments.trim()) {
        alert('La justificació és obligatòria')
        return
      }
      if (!this.accepted) {
        if (!confirm("Estas indicant que NO vas a aplicar cap d'aquestes propostes, ni siquiera parcialment. ¿Vols continuar amb aquesta elecció?")) {
          return
        }
      }
      if (await this.evaluateImprovement({accepted: this.accepted, comments: this.comments})) {
        this.done = true
//        this.$router.push('/learn-sit')
      }
    }
  }
}
</script>

<template>
  <main>
    <app-breadcrumb :actualStep="2" :done="done"></app-breadcrumb>
    <h2>{{ syllabus.module.name }} ({{ syllabus.turn }})</h2>
    <h3>Propostes de millora</h3>
    <div v-if="syllabus.improvementProposal">
      <p>{{ syllabus.improvementProposal.proposals }}</p>
      <form @submit.prevent="handleForm">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" v-model="accepted" />
          <label class="form-check-label"> Vaig a aplicar aquestes propostes p part d'elles </label>
        </div>
        <div class="mb-3">
          <label class="form-label">Justificació</label>
          <textarea class="form-control" v-model="comments" rows="3"></textarea>
        </div>
        <button type="submit" class="btn btn-secondary">Enviar</button>
      </form>
    </div>
    <div v-else>
      <p>No hi ha propostes de millora</p>
    </div>
  </main>
</template>
