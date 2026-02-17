<script>
import { mapActions } from 'pinia'
import { Modal } from 'bootstrap'
import { useDataStore } from '@/stores/data'
import { api } from '@/repositories/api'
import { statusClass } from '@/utils/utils.js'
import ModalComponent from '@/components/ModalComponent.vue'

export default {
  components: {
    ModalComponent
  },
  async mounted() {
    this.getPccs()
    try {
      const response = await api.getCycles()
      this.cycles = response.data
    } catch (error) {
      this.addMessage('error', error)
    }
    this.rejectPccModal = new Modal(document.getElementById('rejectPccModal'))
  },
  data() {
    return {
      pccs: [],
      cycles: [],
      statusOptions: [
        { value: 'pending', label: 'pendent' },
        { value: 'sent', label: 'enviat' },
        { value: 'approved', label: 'aprovat' },
        { value: 'rejected', label: 'rebutjat' },
        { value: 'verified', label: 'verificat' }
      ],
      cycleFilter: 0,
      cycleNameFilter: '',
      statusFilter: '',
      loading: false,
      page: 1,
      itemsPerPage: 25,
      rejectPccModal: null,
      modalFields: {},
      errors: {}
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage', 'refreshPccByCycleId']),
    async getPccs() {
      try {
        this.loading = true
        const response = await api.getPccsPaginated(this.getFilter())
        this.pccs = response.data['hydra:member'] || response.data
      } catch (error) {
        this.addMessage('error', error)
      }
      this.loading = false
    },
    statusClass(status) {
      return statusClass(status)
    },
    formatStatus(status) {
      const labels = {
        pending: 'pendent',
        sent: 'enviat',
        approved: 'aprovat',
        rejected: 'rebutjat',
        verified: 'verificat'
      }
      return labels[status] || status
    },
    getCycleId(pcc) {
      if (pcc?.cycle?.id) return pcc.cycle.id
      if (pcc?.cycle?.['@id']) {
        const id = parseInt(pcc.cycle['@id'].split('/').pop(), 10)
        return Number.isNaN(id) ? null : id
      }
      if (typeof pcc?.cycle === 'string') {
        const id = parseInt(pcc.cycle.split('/').pop(), 10)
        return Number.isNaN(id) ? null : id
      }
      return null
    },
    getCycleShortName(pcc) {
      if (pcc?.cycle?.shortName) return pcc.cycle.shortName
      const cycleId = this.getCycleId(pcc)
      if (!cycleId) return ''
      const cycle = this.cycles.find((item) => item.id === cycleId)
      return cycle?.shortName || ''
    },
    clear() {
      this.cycleFilter = 0
      this.cycleNameFilter = ''
      this.statusFilter = ''
      this.getPccs()
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

      return encodeURI(filter)
    },
    setPage(page) {
      this.page = page
      this.getPccs()
    },
    async approve(pcc) {
      const cycleName = this.getCycleShortName(pcc)
      if (confirm(`Vas a aprovar el PCC del cicle "${cycleName}"`)) {
        try {
          this.loading = true
          await api.pccApprove(pcc.id)
          this.addMessage('success', 'PCC aprovat')
          this.pccs.find((item) => item.id === pcc.id).status = 'approved'
        } catch (error) {
          this.addMessage('error', error)
        }
        this.loading = false
      }
    },
    async verify(pcc) {
      const cycleName = this.getCycleShortName(pcc)
      if (confirm(`Vas a verificar el PCC del cicle "${cycleName}"`)) {
        try {
          this.loading = true
          await api.pccVerify(pcc.id)
          this.addMessage('success', 'PCC verificat')
          this.pccs.find((item) => item.id === pcc.id).status = 'verified'
        } catch (error) {
          this.addMessage('error', error)
        }
        this.loading = false
      }
    },
    showRejectModal(pcc) {
      this.errors = {}
      this.modalFields = {
        id: pcc.id,
        reason: ''
      }
      this.rejectPccModal.show()
    },
    async setPending(pcc) {
      const cycleName = this.getCycleShortName(pcc)
      if (confirm(`Vas a posar el PCC del cicle "${cycleName}" com a pendent`)) {
        try {
          await api.pccPending(pcc.id)
          this.addMessage('success', 'PCC posat com a pendent')
          this.pccs.find((item) => item.id === pcc.id).status = 'pending'
        } catch (error) {
          this.addMessage('error', error)
        }
      }
    },
    async reject() {
      if (this.modalFields.reason.length < 8) {
        this.errors.reason = 'El motiu és obligatori i ha de tindre al menys 8 caràcters'
        return
      }
      try {
        await api.pccReject(this.modalFields.id, {
          reason: this.modalFields.reason
        })
        this.addMessage('success', 'PCC rebutjat')
        this.rejectPccModal.hide()
        const pccItem = this.pccs.find((item) => item.id === this.modalFields.id)
        if (pccItem) {
          pccItem.status = 'rejected'
        }
        const cycleId = this.getCycleId(pccItem)
        if (cycleId) {
          const refreshed = await this.refreshPccByCycleId(cycleId)
          if (refreshed && pccItem) {
            Object.assign(pccItem, refreshed)
          }
        }
      } catch (error) {
        this.addMessage('error', error)
      }
    },
    openPcc(pcc) {
      const cycleId = this.getCycleId(pcc)
      if (!cycleId) {
        this.addMessage('error', "No s'ha pogut determinar el cicle del PCC")
        return
      }
      localStorage.pccCycleId = cycleId
      this.$router.push('/pcc/context')
    }
  }
}
</script>

<template>
  <div class="border-bottom border-3 pcc"></div>
  <main class="border shadow view-main">
    <ModalComponent @save="reject" modalId="rejectPccModal" title="Rebutjar PCC" @submit="reject">
      <div class="row">
        <div class="form-group">
          <label for="reason">Motiu del rebutjament</label>
          <textarea
            v-model="modalFields.reason"
            class="form-control"
            id="reason"
            rows="3"
            placeholder="Escriu el motiu del rebutjament"
          ></textarea>
          <small class="text-danger">{{ errors.reason }}</small>
        </div>
      </div>
    </ModalComponent>
    <div class="p-lg-4 p-1 overflow-auto">
      <h2 class="fw-bold">Gestió dels projectes curriculars</h2>
      <div class="p-3 alert pcc border text-white">
        <div class="row mb-3">
          <div class="row align-items-center">
            <label class="col-12 col-lg-1 p-2 fw-bold">Cicle:</label>
            <input
              @input="getPccs"
              size="10"
              type="text"
              v-model="cycleNameFilter"
              class="form-input col-12 col-lg-5 p-2 m-lg-0 m-2"
              placeholder="Escriu el nom del cicle"
            />
            <div class="col-12 col-lg-6 p-0">
              <select
                @change="getPccs"
                v-model.number="cycleFilter"
                class="d-inline mx-2 form-select fw-bold"
              >
                <option :value="0">--- o tria un cicle ---</option>
                <option v-for="cycle in cycles" :value="cycle.id" :key="cycle.id">
                  {{ cycle.shortName }}
                </option>
              </select>
            </div>
          </div>
        </div>
        <div class="row align-items-center">
          <div class="col-lg-5 text-center col-sm-12">
            <select
              id="statusFilter"
              @change="getPccs"
              v-model="statusFilter"
              class="d-inline form-select p-2 fw-bold"
            >
              <option value="">--- Seleccionar Estat ---</option>
              <option v-for="state in statusOptions" :value="state.value" :key="state.value">
                {{ state.label }}
              </option>
            </select>
          </div>
          <div class="col-lg text-center col-sm-12 m-1">
            <button @click="clear" type="button" class="btn btn-secondary">Borrar filtres</button>
          </div>
        </div>
      </div>
      <div style="overflow: auto">
        <table class="table table-striped col-lg-12 text-center">
          <thead>
            <th>Cicle</th>
            <th>Enviat per</th>
            <th>Estat</th>
            <th>Accions</th>
          </thead>
          <tbody :class="{ 'd-none': this.loading }">
            <tr v-for="pcc in pccs" :key="pcc.id">
              <td>{{ getCycleShortName(pcc) }}</td>
              <td v-if="pcc.sentUser">{{ pcc.sentUser.name }} {{ pcc.sentUser.surname }}</td>
              <td v-else>No establit</td>
              <td class="align-middle">
                <span :class="statusClass(pcc.status)">{{ formatStatus(pcc.status) }}</span>
              </td>
              <td>
                <div class="btn-group">
                  <button
                    @click="approve(pcc)"
                    :hidden="
                      pcc.status !== 'sent' &&
                      pcc.status !== 'enviat' &&
                      pcc.status !== 'verified' &&
                      pcc.status !== 'verificat'
                    "
                    type="button"
                    class="btn btn-primary btn-sm"
                    title="Aprovar"
                  >
                    <i class="bi bi-check2-circle"></i></button
                  >&nbsp;
                  <button
                    @click="showRejectModal(pcc)"
                    :hidden="
                      pcc.status !== 'sent' &&
                      pcc.status !== 'enviat' &&
                      pcc.status !== 'verified' &&
                      pcc.status !== 'verificat'
                    "
                    type="button"
                    class="btn btn-danger btn-sm"
                    title="Rebutjar"
                  >
                    <i class="bi bi-x"></i></button
                  >&nbsp;
                  <button
                    @click="verify(pcc)"
                    :hidden="pcc.status !== 'sent' && pcc.status !== 'enviat'"
                    type="button"
                    class="btn btn-success btn-sm"
                    title="Marcar com a Verificat"
                  >
                    <i class="bi bi-shield-check"></i></button
                  >&nbsp;
                  <button
                    @click="setPending(pcc)"
                    :hidden="pcc.status === 'pending' || pcc.status === 'pendent'"
                    type="button"
                    class="btn btn-warning btn-sm"
                    title="Posar Pendent"
                  >
                    <i class="bi bi-unlock-fill"></i></button
                  >&nbsp;
                  <button
                    @click="openPcc(pcc)"
                    type="button"
                    class="btn btn-info btn-sm"
                    title="Veure"
                  >
                    <i class="bi bi-eye-fill"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4">
                <div class="text-center p-2" :class="{ 'd-none': !this.loading }">
                  <span class="spinner-border text-primary m-auto"></span>
                </div>
                <div class="mt-2">
                  <strong class="p-2">Projectes per pàgina:</strong>
                  <select @change="getPccs" v-model="itemsPerPage">
                    <option>5</option>
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                </div>
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
                :class="{ disabled: pccs.length < itemsPerPage }"
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
