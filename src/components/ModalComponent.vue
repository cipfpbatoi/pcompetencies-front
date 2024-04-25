<script>
export default {
  emits: ['save'],
  props: {
    modalId: {
      type: String,
      default: 'unitMmodalComp'
    },
    title: String
  },
  methods: {
    async save() {
        this.$emit('save')
    }
  }
}
</script>

<template>
  <!-- Modal -->
  <div
    class="modal fade"
    :id="modalId"
    tabindex="-1"
    aria-labelledby="modalTitle"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-darkgrey">
          <h1 class="modal-title fs-5" id="modalTitle">{{ title }}</h1>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <slot></slot>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tanca</button>
          <button @click="save" type="button" class="btn btn-secondary">Guarda</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error {
  color: red;
}
</style>
