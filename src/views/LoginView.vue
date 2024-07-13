<script>
import { useDataStore } from '@/stores/data'
import { mapState, mapActions } from 'pinia'
import * as yup from 'yup'
import { object } from 'yup'
import { validateFormErrors } from '../utils/utils.js'

const validationSchema = object({
  email: yup
    .string()
    .trim()
    .required('El email és obligatori')
    .email('El email debe de ser válido'),
  password: yup.string().trim().required('La contrasenya no pot estar buida')
})

export default {
  data() {
    return {
      errors: {},
      credentials: {},
      redirect: false,
      showPassword: false,
      isLogging: false
    }
  },
  computed: {
    ...mapState(useDataStore, ['user'])
  },
  mounted() {
    if (localStorage.redirect) {
      this.redirect = JSON.parse(localStorage.redirect)
      this.addMessage('error', this.redirect.message)
    }
  },
  methods: {
    ...mapActions(useDataStore, ['loginUser', 'addMessage']),
    async handleForm() {
      this.errors = await validateFormErrors(validationSchema, this.credentials)
      if (this.errors.length) return
      this.isLogging = true;
      if (await this.loginUser(this.credentials)) {
        if (this.redirect) {
          this.$router.push(this.redirect.path)
        } else {
          this.$router.push('/')
          if (this.user.info?.roles.includes('ROLE_HEAD_DEPARTMENT')
            || this.user.info?.roles.includes('ROLE_ADMIN')) {
            this.$router.push('/syl-manage')
          } else {
            this.$router.push('/')
          }
        }
      }
      this.isLogging = false;
    }
  }
}
</script>

<template>
  <div>
    <div class="col-12 col-md-5 mx-auto card mt-2 mt-sm-5 border-info">
      <div class="card-header border-info bg-info">
        <h2 class="text-center p-lg-3 text-white h1">¡Hola!<i class="bi bi-emoji-smile p-2"></i></h2>
      </div>
      <div class="card-body">
        <p class="text-danger fw-semibold text-center" v-html="$route.query.message"></p>
        <form @submit.prevent="handleForm">
          <div class="mb-3">
            <label class="form-label fw-bold">Usuari</label>
            <input
              type="email"
              class="form-control"
              v-model="credentials.email"
              placeholder="email de l'usuari que gestionarà el compte"
            />
            <p v-if="errors.email" class="error">{{ errors.email }}</p>
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold text-center">Contrasenya</label>
            <div v-if="showPassword" class="input-group">
            <span class="input-group-text" @click="showPassword = !showPassword">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-eye-slash"
                viewBox="0 0 16 16"
              >
                <path
                  d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z"
                ></path>
                <path
                  d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829"
                ></path>
                <path
                  d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z"
                ></path>
              </svg>
            </span>
              <input
                type="text"
                class="form-control"
                v-model="credentials.password"
                placeholder="Mínim 7 caracters"
              />
            </div>
            <div v-else class="input-group">
            <span class="input-group-text" @click="showPassword = !showPassword">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-eye"
                viewBox="0 0 16 16"
              >
                <path
                  d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"
                ></path>
                <path
                  d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"
                ></path>
              </svg>
            </span>
              <input
                type="password"
                class="form-control"
                v-model="credentials.password"
                placeholder="Mínim 7 caracters"
              />
            </div>
            <p v-if="errors.password" class="error">{{ errors.password }}</p>
          </div>
          <div class="text-center">
            <span class="spinner-border text-primary" :class="{ 'd-none' : !this.isLogging }"></span>
            <button type="submit" class="btn btn-primary" :class="{ 'd-none' : this.isLogging }">Iniciar Sessió</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
form i {
  margin-left: -30px;
  cursor: pointer;
}
.info {
  background-color: lightgrey;
  padding: 10px;
}
.error {
  color: red;
}
</style>
