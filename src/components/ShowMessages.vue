<script>
import { useDataStore } from '../stores/data'
import { mapState, mapActions } from 'pinia'

export default {
  computed: {
    ...mapState(useDataStore, ['messages']),
  },
  methods: {
    ...mapActions(useDataStore, ['delMessage'])
  },
}
</script>

<template>

  <div class="toast-container">
    <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
  <div v-for="message in messages" :key="message.id"
    data-bs-autohide="false" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="toast-header text-white" :class="message.bgColor">
      <strong class="me-auto">{{ message.title }}</strong>
      <small class="text-muted">{{ message.time }}</small>
      <button @click="delMessage(message.id)" type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      {{ message.text }}
    </div>
  </div>
</div>
</div>
</template>

<style>
.toast {
  display: block  !important;
}
</style>