<script>
import { mapState, mapActions } from 'pinia'
import { useDataStore } from '../stores/data'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { api } from '@/repositories/api'

export default {
  components: {
    AppBreadcrumb,
  },
  computed: {
    ...mapState(useDataStore, ['syllabus'])
  },
}
</script>

<template>
    <main class="border shadow view-main">
      <app-breadcrumb :actualStep="10" :done="false"></app-breadcrumb>
    <div class="p-lg-4 p-1 p-sm-0">
      <h2>{{ syllabus.module?.name }} ({{ syllabus.turn }}) - {{ syllabus.courseYear }}</h2>
      <h2>10. Validar i enviar la programació</h2>
      <div class="bg-danger m-1">
        <p class="text-white">La programació te errors i has de corregir-los abans d'enviar-la</p>
    </div>
    </div>
    </main>

</template>