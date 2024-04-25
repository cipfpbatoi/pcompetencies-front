<script>
import ShowTable from './ShowTable.vue'
import { useDataStore } from '@/stores/data'
import { mapState } from 'pinia'

const didacticContentsColumns = [
  {
    title: 'Cod.',
    value: 'code'
  },
  {
    title: 'Contingut',
    value: 'descriptor'
  }
]

export default {
  emits: ['save'],
  props: {
    learningSituation: {
      type: Object,
      required: true
    }
  },
  components: {
    ShowTable,
  },
  computed: {
    ...mapState(useDataStore, ['module']),
  },
  data() {
    return {
      newContent: '',
      deployedRaContent: 0,
      didacticContentsColumns,
      errors: [],
    }
  },
  methods: {
    toogleDeployedRaContent(raId) {
      this.deployedRaContent = this.deployedRaContent == raId ? 0 : raId
    },
    getContentsBlock(ra) {
      return (
        this.module.learningResults?.find((item) => item.id === ra.learningResult.id)
          .contentsBlock || []
      )
    },
    addContent(raContent) {
      let newContent = ''
      if (typeof raContent == 'string') {
        newContent = raContent
      } else {
        if (!this.newContent.trim()) {
          this.errors.newContent = "Has d'introduir el nou contingut"
          return
        }
        newContent = this.newContent
      }
      const newContents = this.learningSituation.didacticContents.map((item) => item.descriptor)
      newContents.push(newContent)
      this.$emit('save', newContents)
      this.newContent = ''
    },
    editContent(content, index) {
      const editedContent = prompt('Modifica el contingut', content.descriptor)
      if (editedContent) {
        const descriptors = this.learningSituation.didacticContents.map((item) => item.descriptor)
        descriptors[index] = editedContent
        this.$emit('save', descriptors)
      }
    },
    delContent(content) {
      if (
        confirm(
          'ATENCIÓ: Vas a esborrar el contingut "' +
            content.descriptor +
            '". Aquest procés NO es por des-fer !!!'
        )
      ) {
        this.$emit('save', this.learningSituation.didacticContents
            .filter((item) => item.id != content.id)
            .map((item) => item.descriptor)
        )
      }
    },
    changeContentPosition(content, newPosition) {
      const contentToSwap = this.learningSituation.didacticContents.find(
        (item) => item.position == content.position + newPosition
      )
      if (contentToSwap) {
        contentToSwap.position = content.position
      }
      content.position = content.position + newPosition
      this.$emit('save', 
        this.learningSituation.didacticContents
          .sort((item1, item2) => item1.position - item2.position)
          .map((item) => item.descriptor)
      )
    },
  }
}
</script>

<template>
    <div class="bordered">
      <div
        class="bordered"
        v-for="result in learningSituation.ponderedLearningResults"
        :key="result.id"
      >
        <div class="position-relative">
          <h5 class="position-absolute start-0">
            RA {{ result.learningResult.number }}: {{ result.learningResult.descriptor }}
          </h5>
          <button
            class="position-absolute end-0 btn btn-link"
            @click="toogleDeployedRaContent(result.id)"
            type="button"
            title="Mostra els continguts"
          >
            <i class="bi bi-eye"></i>
          </button>
        </div>
        <br /><br />
        <div v-if="result.id === deployedRaContent">
          <div v-for="block in getContentsBlock(result)" :key="block.id">
            <h5>{{ block.title }}</h5>
            <ShowTable :data="block.contents" :columns="[{ title: 'Continguts' }]">
              <template v-slot="{ item }">
                <button
                  @click="addContent(item)"
                  class="btn btn-secondary"
                  title="Afegir contingut"
                >
                  <i class="bi bi-plus"></i>
                </button>
              </template>
            </ShowTable>
          </div>
        </div>
      </div>
      <h5>Continguts de la Situació d'Aprenentatge</h5>
      <show-table :data="learningSituation.didacticContents" :columns="didacticContentsColumns">
        <template v-slot="{ item, index }">
          <button
            @click="changeContentPosition(item, -1)"
            class="btn btn-secondary"
            title="Pujar"
            :disabled="item.position <= 1"
          >
            <i class="bi bi-arrow-up"></i>
          </button>
          <button
            :disabled="item.position >= learningSituation.didacticContents.length"
            @click="changeContentPosition(item, 1)"
            class="btn btn-secondary"
            title="Baixar"
          >
            <i class="bi bi-arrow-down"></i>
          </button>
          <button @click="editContent(item, index)" class="btn btn-secondary" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button @click="delContent(item, index)" class="btn btn-secondary" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
        </template>
      </show-table>
      <form @submit.prevent="addContent">
        <div class="input-group">
          <input
            type="text"
            class="form-control"
            v-model="newContent"
            placeholder="Afegir nou contingut"
          />
          <button type="submit" class="btn btn-secondary" title="Establir objectiu">
            Afegir nou contingut
          </button>
        </div>
        <span v-if="errors.newContent" class="error">{{ errors.newContent }}</span>
      </form>
    </div>
</template>

<style scoped>
.bordered {
  border: 1px solid black;
  padding: 5px;
  margin: 5px auto;
}
.error {
  color: red;
}
</style>