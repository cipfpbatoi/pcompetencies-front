<script>
import { useDataStore } from '@/stores/data'
import { mapActions } from 'pinia'
import * as yup from 'yup'
import { object } from 'yup'

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
      errors: [],
      user: {},
      redirect: false,
    }
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
      try {
        // Valida los datos del formulario con Yup
        await validationSchema.validate(this.user, { abortEarly: false })
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
      if (await this.loginUser(this.user)) {
          if (this.redirect) {
            localStorage.removeItem('redirect') // Limpiar la ruta de redirección
            this.$router.push(this.redirect.path) // Redirigir al usuario a la ruta almacenada
          } else {
            this.$router.push('/') // Redirigir al usuario a la página de inicio
          }
        }

    }
  }
}
</script>

<template>
  <div>
    <p class="info" v-html="$route.query.message"></p>
    <div class="col-md-5 mx-auto border p-3">
      <h2>Inicia sessió</h2>
      <form @submit.prevent="handleForm">
        <div class="mb-3">
          <label class="form-label">Email per a loguejarse</label>
          <input
            type="email"
            class="form-control"
            v-model="user.email"
            placeholder="email de l'usuari que gestionarà el compte"
          />
          <p v-if="errors.email" class="error">{{ errors.email }}</p>
        </div>
        <div class="mb-3">
          <label class="form-label">Contrasenya</label>
          <input
            type="password"
            class="form-control"
            v-model="user.password"
            placeholder="Mínim 7 caracters"
          />
          <p v-if="errors.password" class="error">{{ errors.password }}</p>
          <div class="mt-2">
            <a href="https://backend.projecteg3.ddaw.es/forgot-password">He oblidat la contrasenya</a>
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Enviar</button>
      </form>
      </div>
    </div>
</template>

<style scoped>
.info {
  background-color: lightgrey;
  padding: 10px;
}
.error {
  color: red;
}
</style>
