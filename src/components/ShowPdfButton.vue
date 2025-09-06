<script>
import ActionButton from './ActionButton.vue'
import { api } from '@/repositories/api'
import { useDataStore } from '@/stores/data'
import { mapActions } from 'pinia'

export default {
  emits: ['waiting'],
  components: {
    ActionButton
  },
  props: {
    syllabus: {
      type: Object,
      required: true
    },
    buttonClass: {
      type: String,
      default: 'btn btn-danger col-12 col-sm-5'
    },
    title: {
      type: String,
      default: 'Veure esborrany'
    }
  },
  // mounted() {
  //   const pdf = new PDFObject({
  //     url: this.pdf,
  //     pdfOpenParams: {
  //       view: 'FitV',
  //       page: '1'
  //     }
  //   }).embed('pdf')
  // },
  methods: {
    ...mapActions(useDataStore, ['addMessage']),
    async showPdf() {
      this.$emit('waiting', true)
      try {
        const response = await api.getPdf(this.syllabus.id)
        if (!response) {
          this.addMessage('error', response)
          this.$emit('waiting', false)
          return
        }
        this.$emit('waiting', false)
        const url = URL.createObjectURL(
          new Blob([response.data], {
            type: 'application/pdf'
          })
        )
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', this.syllabus.center.code
          + '-' + this.syllabus.cycle.shortName.split(' ').join('_')
          + '-' + this.syllabus.module.code
          + '-' + this.syllabus.courseYear
          + '-' + this.syllabus.turn + '.pdf')
        document.body.appendChild(link)
        this.$emit('waiting', false)

        link.click()
      } catch (error) {
        this.addMessage('error', error)
      }
      this.$emit('waiting', false)
    }
  }
}
</script>

<template>
  <ActionButton
    @click="showPdf()"
    :buttonClass="buttonClass"
    :title="title"
    icon-class="bi bi-file-earmark-pdf-fill"
  ></ActionButton>
</template>
