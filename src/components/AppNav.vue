<script>
import { useDataStore } from '../stores/data'
import { mapState, mapActions } from 'pinia'

export default {
  computed: {
    ...mapState(useDataStore, ['user']),
    isLogged() {
      return !!this.user.token
    },
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
  <nav>
    <ul class="nav nav-tabs">
      <template v-if="isLogged">
        <li class="nav-item">
        <RouterLink class="nav-link" to="/">Home</RouterLink>
      </li>
      <li class="nav-item">
        <RouterLink @click.prevent="logout" class="nav-link" to="/login">Logout</RouterLink>
      </li>
      </template>
      <template v-else>
        <li class="nav-item">
          <RouterLink class="nav-link" to="/login">Login</RouterLink>
        </li>
      </template>
      <li class="nav-item">
        <RouterLink class="nav-link" to="/about">About</RouterLink>
      </li>
    </ul>
  </nav>
</template>
