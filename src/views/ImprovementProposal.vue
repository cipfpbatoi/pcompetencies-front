<script>
import { mapState } from 'pinia'
import { useDataStore } from '../stores/data'

export default {
  computed: {
    ...mapState(useDataStore, ['programming'])
  },
  data() {
    return {
      done: false, //!!this.programming.improvementProposal,
      ipApply: false,
      ipDescrip: ''
    }
  },
  methods: {
    handleForm() {

    }
  }
}
</script>

<template>
  <main>
    <div class="bg-secondary text-white">
      <button @click="$router.push('/')" class="btn btn-sm btn-link">
        Pas 1: selecciona mòdul
      </button>
      -> Pas 2: propostes de millora ->
      <button @click="$router.push('/work-units')" :disabled="!done">Següent pas</button>
    </div>
    <h2>Propostes de millora</h2>
    <div v-if="!programming.improvementProposal">
      <p>{{ programming.improvementProposal }}</p>
      <form @submit.prevent="handleForm">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" v-model="ipApply" />
          <label class="form-check-label"> Vaig a aplicar aquestes propostes p part d'elles </label>
        </div>
        <div class="mb-3">
          <label class="form-label">Justificació</label>
          <textarea class="form-control" v-model="ipDescrip" rows="3"></textarea>
        </div>
        <button type="submit" class="btn btn-secondary">Enviar</button>
      </form>
    </div>
    <div v-else>
      <p>No hi ha propostes de millora</p>
      <button @click="$router.push('/work-units')">Següent pas</button>
    </div>
  </main>
</template>
