<script>
import { useDataStore } from '../stores/data'
import { mapState } from 'pinia'

export default {
  props: {
    learningResultId: Number
  },
  computed: {
    ...mapState(useDataStore, ['getEvalCriteriaByLearningResult']),
    evalCriteria() {
      return this.getEvalCriteriaByLearningResult(this.learningResultId)
    }
  }
}
</script>

<template>
  <div>
    <table class="table table-striped">
      <thead>
        <th>CA</th>
        <th>Descrip.</th>
        <th></th>
      </thead>
      <tbody>
        <template v-for="criteri in evalCriteria" :key="criteri.id">
          <tr>
            <td>{{ criteri.code }}</td>
            <td>{{ criteri.description }}</td>
            <td></td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
