<script>
import { useDataStore } from '@/stores/data'
import { mapState, mapActions } from 'pinia'

export default {
  computed: {
    ...mapState(useDataStore, ['user']),
    isAdminOrHeadOfDepartament() {
      return this.user.info?.roles.includes('ROLE_HEAD_DEPARTMENT') || this.user.info?.roles.includes('ROLE_ADMIN');
    },
    isLogged() {
      return this.user.token
    },
    getUserInfo() {
      return this.user.info;
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
  },
}
</script>

<template>
  <p class="text-center text-lg-end text-secondary" v-if="getUserInfo">Hola
    <span class="fw-bold m-0 p-0">{{getUserInfo.name + ' ' + getUserInfo.surname}}</span>
    <span class=text-secondary> ({{getUserInfo.department.shortName}})</span>
  </p>
  <nav class="navbar justify-content-lg-end justify-content-center">
    <ul class="nav">
      <li class="nav-item">
        <RouterLink class="nav-link" to="/">Inici</RouterLink>
      </li>
      <template v-if="isLogged">
        <li class="nav-item" v-if="isAdminOrHeadOfDepartament">
          <RouterLink class="nav-link" to="/syl-manage">Gestionar programacions</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink @click.prevent="logout" class="nav-link" to="/login">Eixir</RouterLink>
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
