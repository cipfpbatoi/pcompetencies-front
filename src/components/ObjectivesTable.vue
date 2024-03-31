<script>
import { mapState } from 'pinia'
import { useDataStore } from '../stores/data'

export default {
  props: {
    selectable: {
      type: Boolean,
      default: false
    },
    selected: Array
  },
  computed: {
    ...mapState(useDataStore, ['cycle']),
    selectableGeneralObjectives() {
      if (!this.cycle?.generalObjectives) return []
      if (this.selectable) {
        return this.cycle.generalObjectives.map((item) => {
          return {
            ...item,
            checked: this.selected?.includes(item.id) || false
          }
        })
      }
      return this.cycle.generalObjectives
    },
    selectedObjectives() {
      return this.selectableGeneralObjectives
      .filter((item) => item.checked)
      .map((item) => item.id)
    }
  },
  data() {
    return {
      generalObjectives: []
    }
  }
}
</script>

<template>
  <div>
    <table class="table table-striped">
      <thead>
        <th v-if="selectable">Sel.</th>
        <th>Codi</th>
        <th>Descripció</th>
      </thead>
      <tbody>
        <tr v-for="objective in selectableGeneralObjectives" :key="objective.id">
          <td v-if="selectable">
            <input type="checkbox" v-model="objective.checked" />
          </td>
          <td>{{ objective.code }}</td>
          <td>{{ objective.description }}</td>
        </tr>
      </tbody>
    </table>
    <slot :selectedObjectives="selectedObjectives"></slot>
  </div>
</template>
