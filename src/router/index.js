import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LearningSituations from '../views/LearningSituations.vue'
import LSDevelopment from '../views/LSDevelopment.vue'
import LSsDevelopment from '../views/LSsDevelopment.vue'
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
      path: '/develop',
      name: 'LSsDevelopment',
      component: LSsDevelopment,
      meta: { requiresAuth: true }
    },        {
      path: '/learning-situation/:lsId',
      name: 'LSDevelopment',
      component: LSDevelopment,
      props: true,
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
