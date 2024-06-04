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
      // {
      //     number: 1,
      //     title: 'Selecciona la programació',
      //     path: 'selectSyllabus',
      //     nextPath: 'contextSyl'
      //   },
        {
          title: 'Contextualització',
          path: 'contextSyl',
          nextPath: 'imprProp'
        },
        {
          title: 'Propostes de millora',
          path: 'imprProp',
          nextPath: 'learningSituations'
        },
        {
          title: "Crear Situacions d'aprenentatge",
          path: 'learningSituations',
          nextPath: 'LSTest'
        },
        {
          title: 'Comprova els RA',
          path: 'LSTest',
          nextPath: 'LSsDevelopment'
        },
        {
          title: 'Desenvolupar les S.A.',
          path: 'LSsDevelopment',
          nextPath: 'SyllabusQualify'
        },
        {
          title: 'Qualificació',
          path: 'SyllabusQualify',
          nextPath: 'FinalQualify'
        },
        {
          title: 'Qualificació Final',
          path: 'FinalQualify',
          nextPath: 'SyllabusSchedule'
        },
        {
          title: 'Temporalització i Act. compl.',
          path: 'SyllabusSchedule',
          nextPath: 'MethodologicalPrinciples'
        },
        {
          title: 'Metodologia i Materials',
          path: 'MethodologicalPrinciples',
          nextPath: 'ValidateSyllabus'
        },
        {
          title: 'Validar i enviar la programació',
          path: 'ValidateSyllabus',
        },
      ]
    }
  }
}
</script>

<template>
    <div class="bg-info text-center text-white p-1 px-3 mb-3 border-top border-bottom border-2 border-primary text-light shadow">
      <template v-for="(step, index) in steps" :key="index">
        <span v-if="index > 0"> -> </span>
        <button class="btn btn-primary"
          v-if="index !== actualStep -1"
          :title="step.title"
          @click="$router.push({name: step.path, params})"
        > {{  index + 1 }}</button>
        <span class="p-2 text-uppercase" v-if="index == actualStep-1"><span class="bg-white p-1 px-2 mx-1 fw-bold rounded-circle  text-dark">{{ index+1 }}</span> {{ step.title }}</span>
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