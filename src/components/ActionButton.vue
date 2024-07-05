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
    },
    iconClass: {
      type: String,
      default: null
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
    <i v-if="iconClass"
       :class="iconClass"></i>
    {{ title }}
    <span
      v-if="status"
      class="position-absolute top-0 start-100 translate-middle badge rounded-pill border"
      :class="statusClass(status)"
    >
      {{ status }}
    </span>
  </button>
</template>
