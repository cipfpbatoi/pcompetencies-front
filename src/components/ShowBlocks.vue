<script>
import { useDataStore } from '../stores/data';
import { mapState } from 'pinia';

export default {
  emits: ['delete'],
  props: {
    editable: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState(useDataStore, ['contentsBlocks']),
  },
  data() {
    return {}
  },
  methods: {
    delBlock(block) {
      if (
        confirm(
          'ATENCIÓ: Vas a esborrar el block "' +
            block.title +
            '". Aquest procés NO es por des-fer !!!'
        )
      ) {
        this.$emit('delete', block.id)
      }
    }
  }
}
</script>

<template>
  <div>
    <table class="table table-striped">
      <thead>
        <th>Num.</th>
        <th>Títol</th>
      </thead>
      <tbody>
        <tr class="block" v-for="block in contentsBlocks" :key="block.id">
          <td>{{ block.id }}</td>
          <td>
            <h5 class="d-flex justify-content-between"><span>{{ block.title }}</span><span>Resultat d'Aprenentatge: {{ block.learning_result_id }}</span></h5>
            <p>{{ block.contents }}</p>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped></style>
