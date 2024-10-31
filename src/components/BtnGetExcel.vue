<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import { mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import { api } from '@/repositories/api'

export default {
  props: {
    syllabusId: {
      type: Number,
      required: true
    },
    btnClass: {
      type: String,
      default: ' col-sm-5 col-12'
    }
  },
  components: {
    ModalComponent
  },
  data() {
    return {
      isLoading: false,
      GenericModal: null,
      modalFields: {
        studentsCsv: ''
      },
    }
  },
  mounted() {
    this.GenericModal = new Modal(document.getElementById('excelModalComp'))
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    showModal() {
      this.modalFields.studentsCsv = ''
      this.GenericModal = new Modal(document.getElementById('excelModalComp'))
      this.GenericModal.show()
    },
    async getExcel() {
      try {
        this.isLoading = true
        const response = await api.getExcel(
          this.syllabusId,
          this.modalFields.studentsCsv.split(';')
        )
        this.isLoading = false
        this.GenericModal.hide()
        if (response.status !== 200) {
          this.addMessage('error', response)
          return
        }
        const url = URL.createObjectURL(
          new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          })
        )
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'quadern_programacio_' + this.syllabusId)
        document.body.appendChild(link)
        link.click()
      } catch (error) {
        this.addMessage('error', error)
      }
    }
  }
}
</script>

<template>
  <div class="text-center m-2">
    <button
      @click="showModal"
      class="btn btn-primary"
      :class="btnClass"
      title="Quadern del Professorat PDF"
    >
      <i class="bi bi-file-earmark-excel"></i>
      Obtindre quadern de Professorat
    </button>
  </div>
  <ModalComponent @save="getExcel" title="Quadern del professorat" id="excelModalComp">
    <div class="row p-1 align-items-center">
      <p>Pega la llista d'alumnes separats per <strong>punt i coma</strong></p>
      <div>
        <textarea
          class="form-control border-secondary"
          v-model="modalFields.studentsCsv"
          rows="3"
        ></textarea>
      </div>
    </div>
  </ModalComponent>
</template>
