<script>
export default {
  props: {
    actualStep: {
      type: Number,
      default: 0
    },
    done: Boolean,
  },
  data() {
    return {
      steps: [
      {
          number: 1,
          title: 'Selecciona la programació',
          path: 'selectSyllabus',
          nextPath: 'imprProp'
        },
        {
          number: 2,
          title: 'Propostes de millora',
          path: 'imprProp',
          nextPath: 'learningSituations'
        },
        {
          number: 3,
          title: "Situacions d'aprenentatge",
          path: 'learningSituations',
          nextPath: 'testLS-LR'
        },
        {
          number: 4,
          title: 'Comprova els RA',
          path: 'testLS-LR',
          nextPath: 'imprProp'
        },
        {
          number: 5,
          title: 'Coneixements previs',
          path: 'imprProp',
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
          @click="$router.push({name: step.path})"
        > {{  step.number }}</button>
        <span v-if="step.number == actualStep">{{  step.number }}: {{ step.title }}</span>
      </template>
      <template v-if="actualStep < steps.length">
        <span> -> </span>
        <button class="btn btn-light  btn-sm"
        @click="$router.push({ name: steps[actualStep-1].nextPath })" 
        :disabled="!done">Següent</button>
      </template>
    </div>
</template>