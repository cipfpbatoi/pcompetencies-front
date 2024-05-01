<script>
import { useDataStore } from '@/stores/data'
import { mapState, mapActions } from 'pinia'

export default {
  computed: {
    ...mapState(useDataStore, ['user']),
    isLogged() {
      return !!this.user.token
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
  <nav class="navbar navbar-expand-lg justify-content-lg-end">
    <ul class="nav justify-content-end">
      <template v-if="isLogged">
        <li class="nav-item">
          <RouterLink class="nav-link" to="/">Inici</RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink @click.prevent="logout" class="nav-link" to="/login">Eixir</RouterLink>
        </li>
      </template>
      <template v-else>
        <li class="nav-item">
          <RouterLink class="nav-link" to="/login">Entrar</RouterLink>
        </li>
      </template>
      <li class="nav-item">
        <RouterLink class="nav-link" to="/about">Sobre Nosaltres</RouterLink>
      </li>
    </ul>
  </nav>
</template>
