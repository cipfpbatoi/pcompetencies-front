<script>
import { useDataStore } from '../stores/data'
import { mapState } from 'pinia'
export default {
  props: ['title'],
  computed: {
    ...mapState(useDataStore, ['syllabus'])
  },
  methods: {
    showPonderedLearningResults(ponderedLR) {
      if (!ponderedLR) return ''
      return ponderedLR.map((item) => 
        (item.learningResultId || item.learningResult.number) 
        + ` (${item.percentageWeight} %)`).join(', ')
    }
  }
}
</script>

<template>
  <div>
    <h3>{{ title }}</h3>
    <table v-if="syllabus.learningSituations?.length" class="table table-striped">
      <thead>
        <th>Num.</th>
        <th>Títol</th>
        <th>hours</th>
        <th>R.A.</th>
        <th>Accions</th>
      </thead>
      <tbody>
        <tr class="unit" v-for="unit in syllabus.learningSituations" :key="unit.id">
          <td>{{ unit.position }}</td>
          <td>{{ unit.title }}</td>
          <td>{{ unit.hours }}</td>
          <td>{{ showPonderedLearningResults(unit.ponderedLearningResults) }}</td>
          <td>
            <slot :item="unit"></slot>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>No hi ha cap unitat de treball</p>
  </div>
</template>

<style scoped></style>
