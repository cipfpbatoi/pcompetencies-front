<script>
import { mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import { api } from '@/repositories/api'
import { statusClass } from '../utils/utils.js'
import router from '@/router/index.js'

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
      cycleFilter: 0,
      cycleNameFilter: '',
      moduleFilter: '',
      statusFilter: '',
      page: 1,
      itemsPerPage: 25
    }
  },
  methods: {
    router() {
      return router
    },
    ...mapActions(useDataStore, ['addMessage']),
    async getSyllabuses() {
      try {
        const response = await api.getSyllabusesPaginated(this.getFilter())
        this.syllabuses = response.data
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    statusClass(status) {
      return statusClass(status)
    },
    clear() {
      this.cycleFilter = 0
      this.cycleNameFilter = ''
      this.moduleFilter = ''
      this.statusFilter = ''
      this.getSyllabuses()
    },
    getFilter() {
      let filter = `page=${this.page}&itemsPerPage=${this.itemsPerPage}`
      if (this.cycleFilter) {
        filter += `&cycle.id=${this.cycleFilter}`
      }
      if (this.cycleNameFilter) {
        filter += `&cycle.shortName=${this.cycleNameFilter}`
      }
      if (this.statusFilter) {
        filter += `&status=${this.statusFilter}`
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
    <div class="p-lg-4 p-1 overflow-auto">
      <h2 class="fw-bold">Gestió de les programacions</h2>
      <div class="bg-primary-subtle p-2">
        <div class="row mb-3">
          <div class="col-lg-12 d-flex align-items-center">
            <label class="p-2 fw-bold">Cicle:</label>
            <input
              @input="getSyllabuses"
              size="10"
              type="text"
              v-model="cycleNameFilter"
              class="form-input col-5 p-2"
              placeholder="Escriu el nom del cicle"
            />
            <select @change="getSyllabuses" v-model="cycleFilter" class="form-select p-2 mx-2">
              <option value="0">--- o tria un cicle ---</option>
              <option v-for="cycle in cycles" :value="cycle.id" :key="cycle.id">
                {{ cycle.shortName }}
              </option>
            </select>
          </div>
        </div>
        <div class="row align-items-center m-2">
          <div class="col-lg-5 text-center col-sm-12">
            <label class="p-2 fw-bold col-6">Codi del Mòdul:</label>
            <input @input="getSyllabuses" v-model="moduleFilter" class="form-input p-2 col-6" placeholder="Ex. 03012..." />
          </div>
          <div class="col-lg-5 text-center col-sm-12">
            <select id="statusFilter" @change="getSyllabuses" v-model="statusFilter" class="d-inline form-select p-2 fw-bold">
              <option value="">--- Seleccionar Estat ---</option>
              <option v-for="state in status" :value="state" :key="state">{{ state }}</option>
            </select>
          </div>
          <div class="col-lg text-center col-sm-12">
            <button @click="clear" type="button" class="btn btn-secondary btn-sm">Borrar filtres</button>
          </div>
        </div>
      </div>
      <div style="overflow: auto">
        <table class="table table-striped col-lg-12 text-center">
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
            <td v-if="checkeable" class="text-center align-middle">
              <input type="checkbox" v-model="item.checked" />
            </td>
            <td>{{ syl.cycle.shortName }}</td>
            <td>{{ syl.module.code }}</td>
            <td :title="syl.module.code">{{ syl.module.name }}</td>
            <td>{{ syl.turn }}</td>
            <td class="align-middle">
              <span class="text-white p-1" :class="statusClass(syl.status)">{{ syl.status }}</span>
            </td>
            <td>
              <button
                @click="accept" :hidden="syl.status != 'enviada'"
                type="button"
                class="btn btn-success">Aprova</button>&nbsp;
              <button @click="reject"
                      :hidden="syl.status !== 'enviada'"
                      type="button" class="btn btn-danger">Rebutja</button>&nbsp;
              <button @click="this.$router.push('/select/' + syl.cycle.id + '/' + syl.module.code)"
                      type="button" class="btn btn-secondary">Veure</button>
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
