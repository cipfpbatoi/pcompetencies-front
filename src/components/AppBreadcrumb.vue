<script>
export default {
  props: {
    actualStep: {
      type: Number,
      default: 0
    },
    done: Boolean,
    back: {
      type: Boolean,
      default: false
    },
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
          title: "Crear Situacions d'aprenentatge",
          path: 'learningSituations',
          nextPath: 'LSTest'
        },
        {
          number: 5,
          title: 'Comprova els RA',
          path: 'LSTest',
          nextPath: 'LSsDevelopment'
        },
        {
          number: 6,
          title: 'Desenvolupar les S.A.',
          path: 'LSsDevelopment',
          nextPath: 'SyllabusSchedule'
        },
        {
          number: 7,
          title: 'Temporalització',
          path: 'SyllabusSchedule',
          nextPath: 'SyllabusQualify'
        },
        {
          number: 8,
          title: 'Qualificació',
          path: 'SyllabusQualify',
          nextPath: 'FinalQualify'
        },
        {
          number: 9,
          title: 'Qualificació Final',
          path: 'FinalQualify',
          nextPath: 'imprProp'
        },
      ]
    }
  }
}
</script>

<template>
    <div class="bg-info text-center text-white p-1 px-3 mb-3 border-top border-bottom border-2 border-primary text-light shadow">
      <template v-for="step in steps" :key="step.number">
        <span v-if="step.number > 1 && step.number <= actualStep"> -> </span>
        <button class="btn btn-primary"
          v-if="step.number < actualStep"
          :title="step.title"
          @click="$router.push({name: step.path, params})"
        > {{  step.number }}</button>
        <span class="p-2 text-uppercase" v-if="step.number == actualStep"><span class="bg-white p-1 px-2 mx-1 fw-bold rounded-circle  text-dark">{{ step.number }}</span> {{ step.title }}</span>
      </template>
      <template v-if="actualStep < steps.length">
        <span> -> </span>
        <button v-if="back" class="btn btn-success" @click="$router.push({ name: steps[actualStep-1].path, params })" :disabled="!done">Tornar</button>
        <button v-else class="btn btn-success" @click="$router.push({ name: steps[actualStep-1].nextPath, params })" :disabled="!done">Següent</button>
      </template>
    </div>
</template>

<style scoped>
button {
  margin: 5px;
}
span {
  color: white;
  font-weight: bold;
}
</style>