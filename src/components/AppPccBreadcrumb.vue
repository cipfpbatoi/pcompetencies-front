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
          title: 'Contextualització',
          path: 'contextPCC',
          nextPath: 'focusPCC'
        },
        {
          title: 'Enfocament',
          path: 'focusPCC',
          nextPath: 'modulesPCC'
        },
        {
          title: 'Organització dels Mòduls',
          path: 'modulesPCC',
          nextPath: 'assessmentToolsPCC'
        },
        {
          title: 'Instruments d\'Avaluació',
          path: 'assessmentToolsPCC',
          nextPath: 'trainingPlanPCC'
        },
        {
          title: 'Pla Formatiu Empresa',
          path: 'trainingPlanPCC',
          nextPath: 'centerProjectsPCC'
        },
        {
          title: 'Projectes de Centre',
          path: 'centerProjectsPCC',
          nextPath: 'validatePCC'
        },
        {
          title: 'Validar i enviar el PCC',
          path: 'validatePCC',
        },
      ]
    }
  }
}
</script>

<template>
    <div class="card-header pcc text-center text-white p-1 px-3 mb-2 border-top border-bottom border-2 border-danger text-light shadow">
      <template v-for="(step, index) in steps" :key="index">
        <span v-if="index > 0"> -> </span>
        <button class="btn btn-light"
          v-if="index !== actualStep -1"
          :title="step.title"
          @click="$router.push({name: step.path, params})"
        > {{  index + 1 }}</button>
        <span class="p-2 text-uppercase" v-if="index == actualStep-1">
          <span class="bg-white p-1 px-2 mx-1 fw-bold rounded-circle  text-dark">{{ index+1 }}</span>
          <span class="d-none d-sm-inline">{{ step.title }}</span></span>
      </template>
      <template v-if="actualStep < steps.length">
        <span> -> </span>
        <button v-if="back" class="btn btn-success" @click="$router.push({ name: steps[actualStep-1].path, params })" :disabled="!done">Tornar</button>
        <button v-else class="btn btn-dark" @click="$router.push({ name: steps[actualStep-1].nextPath, params })" :disabled="!done">Següent</button>
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