<script>
import RATable from '@/components/RATable'
import { useDataStore } from '../stores/data'
import { mapState } from 'pinia'

export default {
  components: {
    RATable
  },
  computed: {
    ...mapState(useDataStore, ['resultApren']),
    raToAdd() {
      return this.resultApren.find((item) => item.id === this.raSelect) || {}
    }
  },
  data() {
    return {
      utRA: [],
      raSelect: ''
    }
  },
  methods: {
    addRA() {
      this.utRA.push(this.raToAdd)
      this.raSelect = ''
    }
  }
}
</script>

<template>
  <div>
    <h2>Afegir Unitat de Treball</h2>
    <Form>
      <div class="mb-3" v-if="editing">
        <label for="utId" class="form-label">Id</label>
        <Field type="email" class="form-control" name="utId" disabled />
      </div>
      <div class="mb-3">
        <label for="utTitol" class="form-label">Títol</label>
        <Field type="email" class="form-control" name="utTitol" />
      </div>
      <div class="mb-3">
        <label for="utRA" class="form-label">RA</label>
        <RATable :resultApren="utRA"></RATable>
        <Field
          as="select"
          class="form-select"
          v-model="raSelect"
          name="utRA"
          aria-describedby="utRAHelp"
        >
          <option value="">-- Selecciona RA --</option>
          <option v-for="ra in resultApren" :key="ra.id" value="ra.id">ra.nom</option>
        </Field>
        <button type="button" class="btn btn-primary" @click="addRA">Afegeix</button>
        <div id="utRAHelp" class="form-text">Afegeix tots els RA relacionats amb aquesta UT</div>
      </div>
    </Form>
  </div>
</template>
