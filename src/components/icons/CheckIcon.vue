<script>
export default {
  props: {
    checked: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<template>
  <i class="bi bi-check-square text-success" v-if="checked"></i>
  <i class="bi bi-x-square text-danger" v-else></i>
</template>
