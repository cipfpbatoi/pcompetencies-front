<script>
export default {
  props: {
    actualStep: {
      type: Number,
      default: 0
    },
    done: Boolean,
    params: {
      type: Object,
      default: () => {}
    }
  },
  data() {
    return {
      steps: [
      {
          number: 1,
          title: 'Selecciona la programació',
          path: 'selectSyllabus',
          nextPath: 'contextSyl'
        },
        {
          number: 2,
          title: 'Contextualització',
          path: 'contextSyl',
          nextPath: 'imprProp'
        },
        {
          number: 3,
          title: 'Propostes de millora',
          path: 'imprProp',
          nextPath: 'learningSituations'
        },
        {
          number: 4,
          title: "Situacions d'aprenentatge",
          path: 'learningSituations',
          nextPath: 'LSTest'
        },
        {
          number: 5,
          title: 'Comprova els RA',
          path: 'LSTest',
          nextPath: 'LSOjectives'
        },
        {
          number: 6,
          title: 'Objectius',
          path: 'LSOjectives',
          nextPath: 'LSPriorKnowledge'
        },
        {
          number: 7,
          title: 'Coneixements previs',
          path: 'LSPriorKnowledge',
          nextPath: 'LSContents'
        },        {
          number: 8,
          title: 'Continguts',
          path: 'LSContents',
          nextPath: 'imprProp'
        },
      ]
    }
  }
}
</script>

<template>
    <div class="bg-secondary text-white">
      <template v-for="step in steps" :key="step.number">
        <span v-if="step.number > 1 && step.number <= actualStep"> -> </span>
        <button class="btn btn-light  btn-sm"
          v-if="step.number < actualStep"
          :title="step.title"
          @click="$router.push({name: step.path, params})"
        > {{  step.number }}</button>
        <span v-if="step.number == actualStep">{{  step.number }}: {{ step.title }}</span>
      </template>
      <template v-if="actualStep < steps.length">
        <span> -> </span>
        <button class="btn btn-light  btn-sm"
        @click="$router.push({ name: steps[actualStep-1].nextPath, params })" 
        :disabled="!done">Següent</button>
      </template>
    </div>
</template>

<style scoped>
button {
  margin: 5px;
}
</style>