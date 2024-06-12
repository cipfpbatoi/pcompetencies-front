<script>
import { statusClass } from '../utils/utils.js'

export default {
  emits: ['clicked'],
  props: {
    title: {
      type: String,
      required: true
    },
    status: String,
    buttonClass: {
      type: String,
      default: 'btn-primary'
    }
  },
  methods: {
    handleClick() {
      this.$emit('clicked')
    },
    statusClass(status) {
      return statusClass(status)
    }
  }
}
</script>

<template>
  <button @click="handleClick" class="btn btn-primary position-relative" :class="buttonClass">
    {{ title }}
    <span
      v-if="status"
      class="position-absolute top-0 start-100 translate-middle badge rounded-pill"
      :class="statusClass(status)"
    >
      {{ status }}
    </span>
  </button>
</template>
