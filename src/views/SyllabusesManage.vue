<script>
import { mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import { api } from '@/repositories/api'
import { statusClass } from '../utils/utils.js'

export default {
  components: {},
  async mounted() {
    this.getSyllabuses()
    try {
      const [respCycles, respModules] = await Promise.all([api.getCycles(), api.getModules()])
      this.cycles = respCycles.data
      this.modules = respModules.data
    } catch (error) {
      this.addMessage('error', error)
    }
  },
  computed: {},
  data() {
    return {
      syllabuses: [],
      cycles: [],
      modules: [],
      status: ['enviada', 'pendent', 'aprovada', 'rebutjada'],
      checkeable: false,
      cycleFilter: [],
      cycleNameFilter: '',
      moduleFilter: '',
      statusFilter: [],
      page: 1,
      itemsPerPage: 5
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    async getSyllabuses() {
      try {
        const response = await api.getSyllabusesPaginated(this.getFilter())
        this.syllabuses = response.data
        console.log(response)
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    statusClass(status) {
      return statusClass(status)
    },
    clear() {
      this.cycleFilter = []
      this.cycleNameFilter = ''
      this.moduleFilter = ''
      this.statusFilter = []
      this.getSyllabuses()
    },
    getFilter() {
      let filter = `page=${this.page}&itemsPerPage=${this.itemsPerPage}`
      if (this.cycleFilter.length > 0) {
        if (this.cycleFilter.length === 1) {
          filter += `&cycle.id=${this.cycleFilter[0]}`
        } else {
          filter += '&cycle.id[]='
          filter += `${this.cycleFilter.join('&cycle.id[]=')}`
        }
      }
      if (this.cycleNameFilter) {
        filter += `&cycle.shortName=${this.cycleNameFilter}`
      }
      if (this.statusFilter.length > 0) {
        if (this.statusFilter.length === 1) {
          filter += `&status=${this.statusFilter[0]}`
        } else {
          filter += '&status[]='
          filter += `${this.statusFilter.join('&status[]=')}`
        }
      }
      if (this.moduleFilter) {
        filter += `&module.code=${this.moduleFilter}`
      }

      return encodeURI(filter)
    },
    setPage(page) {
      this.page = page
      this.getSyllabuses()
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <div class="p-lg-4 p-1">
      <h2>Gestió de les programacions</h2>
      <div class="row mb-3">
        <div class="col d-flex align-items-center">
          <label>Cicle:</label>
          <input
            @input="getSyllabuses"
            size="10"
            type="text"
            v-model="cycleNameFilter"
            class="form-input"
            placeholder="Escriu el nom del cicle"
          />
          <select
            @change="getSyllabuses"
            size="3"
            v-model="cycleFilter"
            multiple
            class="form-select"
          >
            <option v-for="cycle in cycles" :value="cycle.id" :key="cycle.id">
              {{ cycle.shortName }}
            </option>
          </select>
        </div>
        <div class="col d-flex align-items-center">
          <label>Codi del Mòdul:</label>
          <input @input="getSyllabuses" v-model="moduleFilter" class="form-input" />
        </div>
        <div class="col d-flex align-items-center">
          <label>Estat: </label>
          <select size="3" v-model="statusFilter" class="form-select" multiple>
            <option v-for="state in status" :value="state" :key="state">{{ state }}</option>
          </select>
          <button @click="clear" type="button" class="btn btn-secondary">Borra els filtres</button>
        </div>
      </div>
      <div style="overflow: auto">
        <table class="table table-striped">
          <thead>
            <th v-if="checkeable" title="Selecciona" class="text-center">Sel.</th>
            <th>Cicle</th>
            <th>Codi</th>
            <th>Mòdul</th>
            <th>Torn</th>
            <th>Estat</th>
            <th>Accions</th>
          </thead>
          <tbody>
            <tr v-for="syl in syllabuses" :key="syl.id">
              <td v-if="checkeable" class="text-center">
                <input type="checkbox" v-model="item.checked" />
              </td>
              <td>{{ syl.cycle.shortName }}</td>
              <td>{{ syl.module.code }}</td>
              <td :title="syl.module.code">{{ syl.module.name }}</td>
              <td>{{ syl.turn }}</td>
              <td>
                <span class="text-white" :class="statusClass(syl.status)">{{ syl.status }}</span>
              </td>
              <td>
                <button
                  @click="accept"
                  :disabled="syl.status != 'enviada'"
                  type="button"
                  class="btn btn-success"
                >
                  Aprova</button
                >&nbsp;
                <button
                  @click="reject"
                  :disabled="syl.status != 'enviada'"
                  type="button"
                  class="btn btn-danger"
                >
                  Rebutja</button
                >&nbsp;
                <button
                  @click="open"
                  :disabled="syl.status == 'pendent'"
                  type="button"
                  class="btn btn-warning"
                >
                  Obri
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="9">
                Programacions per pàgina:
                <select @change="getSyllabuses" v-model="itemsPerPage">
                  <option>5</option>
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </td>
            </tr>
          </tfoot>
        </table>

        <nav aria-label="Table navigation">
          <ul class="pagination justify-content-center">
            <li class="page-item">
              <a
                class="page-link"
                :class="{ disabled: page == 1 }"
                @click.prevent="setPage(page - 1)"
                href="#"
                >Anterior</a
              >
            </li>
            <li class="page-item" :class="{ disabled: page == n }" v-for="n in page" :key="n">
              <a class="page-link" @click.prevent="setPage(n)" href="#">{{ n }}</a>
            </li>
            <li class="page-item">
              <a
                class="page-link"
                :class="{ disabled: syllabuses.length < itemsPerPage }"
                @click.prevent="setPage(page + 1)"
                href="#"
                >Següent</a
              >
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </main>
</template>
