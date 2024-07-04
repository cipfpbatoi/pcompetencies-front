<script>
import { api } from '@/repositories/api'
import { mapActions } from 'pinia'
import { useDataStore } from '../stores/data'

export default {
  name: 'LoginIntranet',
  async mounted() {
    const token = this.$route.params.token 
//      'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJodHRwOi8vaW50cmFuZXQuY2lwZnBiYXRvaS5lcyIsImF1ZCI6Imh0dHA6Ly9wcm9ncmFtYWNpb25zLmNpcGZwYmF0b2kuZXMiLCJqdGkiOiJhNGJkODY4ZDMwYTkyNDU5NDIwMmQ1NTJhZWExYjVhNyIsImlhdCI6MTcxOTg0NjUwMy44MDYyNiwibmJmIjoxNzE5ODQ2NTAzLjgwNjI2LCJleHAiOjE3MTk4NTAxMDMuODA2MjYsInJvbGUiOlsiUk9MRV9VU0VSIiwiUk9MRV9URUFDSEVSIl0sIm1vZHVsZSI6bnVsbCwiY3ljbGUiOiJDRk0gU01YICAoTE9FKSIsInR1cm4iOiJwcmVzZW50aWFsIiwibmFtZSI6IkZyYW5jaXNjbyBHYXJjaWEgTWFyY28iLCJlbWFpbCI6ImYuZ2FyY2lhbWFyY29AZWR1Lmd2YS5lcyIsImRlcGFydG1lbnQiOiJJbmYifQ.T8IKq397QpKaVbeloYY8OgPDrd3FjD74XbY_a8w3yqu2Lx1w1NHOMdbfO2xgxxc-jdMn6XpKLKzaySczBuP_5NPENun_-POVS3wj_DPf7hw_Q8K7_PU08dSPRpghT4Fxj4_PDb-Hl6i5ihX7YII3ittb_b_zUHCStaH7pqQlaihmd9OVRYkA_H_2qhxGnj2GVxhHl2qIipMlP__yShkyLUo2ueHKB5QePgbHB9UFiuHM9UP9qnvKCrPsjvxUKWiVbtOZfOXi_YOUIfMdxUtFWQ3FzmAv2RA4kRC-m-IWNhObZrTRCXIVPTXTznQpdat_6jXl18ASeyMTGx5pCnJxcg'
    localStorage.removeItem('token')
    try {
      const response = await api.loginIntranet(token)
      localStorage.token = response.data.jwt
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
    }
  },
  data() {
    return {
      msg: 'Espere per favor'
    }
  },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
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
    <div class="container-fluid px-lg-4">
      <p>{{ msg }}</p>
    </div>
  </main>
</template>
