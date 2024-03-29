<script>
export default {
  props: {
    evaluationCriterias: Array
  },

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
        <template v-for="criteri in evaluationCriterias" :key="criteri.id">
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
