<script>
export default {
  props: {
    data: {
      type: Array,
      default: () => []
    },
    columns: {
      type: Array,
      required: true
    },
    actions: {
      type: Boolean,
      default: true
    },
    checkeable: {
      type: Boolean,
      default: false
    },
  },
  computed: {

  },
  methods: {
    fieldContent(item, col) {
      if (!col) return '???'
      return col?.value
        ? item[col.value] 
        : col.func ?
        col.func(item[col.param])
        : item
    }
  }
}
</script>

<template>
  <div style="overflow: auto">
    <table v-if="data.length" class="table table-striped">
      <thead>
        <th v-if="checkeable" title="Selecciona">Sel.</th>
        <th v-for="(col, index) in columns" :key="index" :title="col.hint">{{ col.title }}</th>
        <th v-if="actions">Accions</th>
      </thead>
      <tbody>
        <tr v-for="(item, index) in data" :key="index">
          <td v-if="checkeable">
            <input type="checkbox" v-model="item.checked" />
          </td>
          <td v-for="(col, tdIndex) in columns" :key="tdIndex" :class="{ 'text-success': item.success }">
            <span v-if="col.html" v-html="fieldContent(item, col)"></span>
            <span v-else>{{ fieldContent(item, col) }}</span>
          </td>
          <td v-if="actions">
            <slot :item="item" :index="index"></slot>
          </td>
        </tr>
      </tbody>
      <tfoot><slot name="footer"></slot></tfoot>
    </table>
    <p v-else>No hi ha dades que mostrar</p>
  </div>
</template>

<style scoped></style>
