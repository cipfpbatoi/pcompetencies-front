<script>
import { useDataStore } from '@/stores/data'
import { mapState, mapActions } from 'pinia'

export default {
  computed: {
    ...mapState(useDataStore, ['user']),
    isAdminOrHeadOfDepartament() {
      return (
        this.user.info?.roles.includes('ROLE_HEAD_DEPARTMENT') ||
        this.user.info?.roles.includes('ROLE_ADMIN')
      )
    },
    canManagePcc() {
      return (
        this.user.info?.roles.includes('ROLE_ADMIN') ||
        this.user.info?.roles.includes('ROLE_DEVELOPER')
      )
    },
    isLogged() {
      return this.user.token
    },
    getUserInfo() {
      return this.user.info
    },
    isloginPage() {
      return window.location.pathname.startsWith('/login')
    }
  },
  methods: {
    ...mapActions(useDataStore, ['logoutUser']),
    logout(ev) {
      if (confirm('Vas a tancar la teua sessió')) {
        this.logoutUser()
        this.$router.push('/login')
      } else {
        ev.preventDefault()
        ev.stopPropagation()
      }
    }
  }
}
</script>

<template>
  <p class="text-center text-lg-end text-secondary" v-if="getUserInfo">
    Hola
    <span class="fw-bold m-0 p-0">{{ getUserInfo.name + ' ' + getUserInfo.surname }}</span>
    <span class="text-secondary"> ({{ getUserInfo.department.shortName }})</span>
    ·
    <span class="link-primary">
      <RouterLink @click.prevent="logout" to="/login">Eixir</RouterLink>
    </span>
  </p>
  <nav class="navbar justify-content-lg-end justify-content-center">
    <ul class="nav text-center justify-content-lg-end justify-content-center">
      <li class="nav-item">
        <RouterLink class="nav-link" to="/">Inici</RouterLink>
      </li>
      <template v-if="isLogged">
        <li class="nav-item dropdown" v-if="isAdminOrHeadOfDepartament">
          <a
            class="nav-link dropdown-toggle"
            href="#"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            Gestió
          </a>
          <ul class="dropdown-menu">
            <li>
              <RouterLink class="dropdown-item" to="/syl-manage"
                >Gestionar programacions</RouterLink
              >
            </li>
            <li v-if="canManagePcc">
              <RouterLink class="dropdown-item" to="/pcc/manage"
                >Gestionar projectes curriculars</RouterLink
              >
            </li>
            <li v-if="user.info?.roles.includes('ROLE_ADMIN')">
              <RouterLink class="dropdown-item" to="/pcc/stats">Estadistiques PCC</RouterLink>
            </li>
          </ul>
        </li>
      </template>
      <template v-else>
        <li class="nav-item" v-if="!isloginPage">
          <RouterLink class="nav-link" to="/login">Entrar</RouterLink>
        </li>
      </template>
      <li class="nav-item">
        <RouterLink class="nav-link" to="/about">Sobre Nosaltres</RouterLink>
      </li>
    </ul>
  </nav>
</template>
