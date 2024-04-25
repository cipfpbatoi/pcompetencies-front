<script>
import { Modal } from 'bootstrap'
import ModalComponent from '../components/ModalComponent.vue'
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import * as yup from 'yup'
import { object } from 'yup'

const validationSchema = object({
  groupContext: yup
    .string()
    .trim()
    .required('Has de posar la contextualització de la programació')
    .min(2, 'Al menys han de tindre 20 caracters')
})

export default {
  components: {
    AppBreadcrumb,
    ModalComponent
  },
  computed: {
    ...mapState(useDataStore, ['syllabus']),
    done() {
      return !!this.syllabus.groupContext
    },
    centerContextualization() {
      return this.showAll
        ? this.syllabus.center?.contextualization
        : this.syllabus.center?.contextualization.substr(0,200) + '...'
    }
  },
  mounted() {
    if (!this.syllabus.id) {
      this.$router.push('/')
    }
    this.modalFields.groupContext = this.syllabus.groupContext
    this.GenericModal = new Modal(document.getElementById('unitMmodalComp'))
  },
  watch: {
    'syllabus.groupContext'(newValue) {
      this.modalFields.groupContext = newValue
    }
  },
  data() {
    return {
      errors: [],
      GenericModal: null,
      modalFields: {},
      showAll: false,
    }
  },
  methods: {
    ...mapActions(useDataStore, ['saveSyllabusGroupContext']),
    showModal() {
      this.GenericModal.show()
    },
    toogleShowAll() {
      this.showAll = !this.showAll
    },
    async saveData() {
      try {
        // Valida los datos del formulario con Yup
        await validationSchema.validate(this.modalFields, { abortEarly: false })
      } catch (error) {
        // Maneja los errores de validación y actualiza el estado de los errores
        const formattedErrors = {}
        if (error.inner) {
          error.inner.forEach((validationError) => {
            formattedErrors[validationError.path] = validationError.message
          })
          this.errors = formattedErrors
        }
        return
      }
      const response = await this.saveSyllabusGroupContext(this.syllabus.id, {
        groupContext: this.modalFields.groupContext
      })
      if (response === 'ok') {
        this.syllabus.groupContext = this.modalFields.groupContext
        this.GenericModal.hide()
      } else {
        if (response.response?.status == 422) {
          const serverError = response.response.data.detail.split(': ')
          this.errors[serverError[0]] = serverError[1]
          return
        }
      }
    }
  }
}
</script>

<template>
  <main>
    <ModalComponent @save="saveData" title="Característiques del grup-classe">
      <div class="row">
        <textarea
          class="form-control"
          v-model="modalFields.groupContext"
          rows="5"
          placeholder="Característiques del grup-classe"
        ></textarea>
        <p v-if="errors.groupContext" class="error">{{ errors.groupContext }}</p>
      </div>
    </ModalComponent>

    <app-breadcrumb :actualStep="2" :done="done"></app-breadcrumb>
    <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }})</h2>
    <h3>Contextualització</h3>
    <h4>Característiques del Centre i l'entorn</h4>
    <p class="bordered" v-html="centerContextualization"></p>
    <span><button @click="toogleShowAll()" class="btn btn-link">Mostrar {{ showAll ? 'menys' : 'tot' }}</button></span>
    <h4>Característiques de l'alumnat</h4>
    <p class="bordered" v-if="syllabus.cycleCenterContext?.studentsProfile" v-html="syllabus.cycleCenterContext?.studentsProfile"></p>
    <p class="bordered text-danger" v-else>
      El departament ha d'establir una contextualització per al cicle</p>
    <h4>Característiques del grup-classe</h4>
    <p class="bordered" v-if="syllabus.groupContext" v-html="syllabus.groupContext"></p>
    <p class="bordered text-secondary fst-italic" v-else >Ha d'indicar les característiques generals del grup-clase (Número de alumnes, posibles dificultats amb l'idioma,...)</p>
    <div class="p-3 text-center">
        <button @click="showModal()" class="btn btn-success" title="Establir objectiu">
          Afegir/Modificar característiques del grup-classe
        </button>
    </div>
  </main>
</template>

<style scoped>
.error {
  color: red;
}
.bordered {
  border: 1px solid black;
  padding: 5px;
  margin: 5px auto;
}
</style>
