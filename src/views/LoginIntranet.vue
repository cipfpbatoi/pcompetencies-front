<script>
import { api } from '@/repositories/api'
import { mapActions } from 'pinia'
import { useDataStore } from '../stores/data'

export default {
  name: 'LoginIntranet',
  async mounted() {
    this.isLoading = true;
    const token = this.$route.params.token
    localStorage.removeItem('token')
    try {
      const response = await api.loginIntranet(token)
      localStorage.token = response.data.jwt
      await this.loadCurrentUser()
      await this.loadData();
      this.isLoading = false;
      this.$router.push({
        name: 'selectedSyllabus',
        params: {
          cycleId: response.data.syllabus.cycle?.id || '0',
          moduleCode: response.data.syllabus.module?.code || '0'
        }
      })
    } catch (error) {
      this.addMessage('error', error)
      this.msg = error.detail || error.message
      this.isLoading = false;
    }
  },
  data() {
    return {
      isLoading: false,
      msg: 'Espere per favor...'
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage', 'loadCurrentUser', 'loadData']),
    login() {
      this.error = ''
      if (this.email === 'admin' && this.password === 'admin') {
        this.$router.push({ name: 'HomeIntranet' })
      } else {
        this.error = 'Email or password is incorrect'
      }
    }
  }
}
</script>

<template>
  <main class="border shadow view-main">
    <h2 class="text-center fw-bold text-primary p-2">Logejant usuari</h2>
    <div class="container-fluid px-lg-4 mt-5 text-center">
      <em class="h4 m-3 text-primary-emphasis text-info-emphasis">{{ msg }}</em>
      <div :class="{ 'd-none' : !this.isLoading }">
        <span class="spinner-border text-primary mt-4"></span>
      </div>
    </div>
  </main>
</template>
