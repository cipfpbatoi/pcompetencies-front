import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LearningSituations from '../views/LearningSituations.vue'
import LSObjectives from '../views/LSObjectives.vue'
import LSContents from '../views/LSContents.vue'
import LSPriorKnowledge from '../views/LSPriorKnowledge.vue'
import TestWorkUnitLR from '../views/TestWorkUnitLR.vue'
import LoginView from '../views/LoginView.vue'
import ImprovementProposal from '../views/ImprovementProposal.vue'
import ContextSyllabus from '../views/ContextSyllabus.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'selectSyllabus',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/context',
      name: 'contextSyl',
      component: ContextSyllabus,
      meta: { requiresAuth: true }
    },
    {
      path: '/impr-prop',
      name: 'imprProp',
      component: ImprovementProposal,
      meta: { requiresAuth: true }
    },
    {
      path: '/learn-sit',
      name: 'learningSituations',
      component: LearningSituations,
      meta: { requiresAuth: true }
    },
    {
      path: '/test',
      name: 'LSTest',
      component: TestWorkUnitLR,
      meta: { requiresAuth: true }
    },
    {
      path: '/objectives',
      name: 'LSOjectives',
      component: LSObjectives,
      meta: { requiresAuth: true }
    },    
    {
      path: '/contents',
      name: 'LSContents',
      component: LSContents,
      meta: { requiresAuth: true }
    },    
    {
      path: '/prior-knowledge',
      name: 'LSPriorKnowledge',
      component: LSPriorKnowledge,
      meta: { requiresAuth: true }
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue')
    }
  ]
})

router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.token

  if (to.meta.requiresAuth && !isAuthenticated) {
    localStorage.setItem('redirectPath', to.fullPath)
    next('/login')
    next({
      name: 'login',
      query: {
        message: `
      <h4>Logueja't</h4>
      <p>T'has de loguejar per a accedir a eixa pàgina.</p>`,
        redirectTo: to.path
      }
    })
  } else {
    next()
  }
})

export default router
