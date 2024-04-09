<script>
export default {
  props: {
    data: {
      type: Array,
      default: () => [],
    },
    columns: {
      type: Array,
      required: true
    },
    actions: {
      type: Boolean,
      default: true
    }
  }
}
</script>

<template>
  <div>
    <table v-if="data.length" class="table table-striped">
      <thead>
        <th v-for="(col, index) in columns" :key="index">{{ col.title }}</th>
        <th v-if="actions">Accions</th>
      </thead>
      <tbody>
        <tr v-for="(item, index) in data" :key="index">
          <td v-for="(col, tdIndex) in columns" :key="tdIndex">
            {{ col.value ? item[col.value] : col.func(item[col.param]) }}
          </td>
          <td v-if="actions">
            <slot :item="item" :index="index"></slot>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>No hi ha dades que mostrar</p>
  </div>
</template>

<style scoped></style>
