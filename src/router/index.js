import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import WorkUnits from '../views/WorkUnits.vue'
import TestWorkUnitLR from '../views/TestWorkUnitLR.vue'
import LoginView from '../views/LoginView.vue'
import ImprovementProposal from '../views/ImprovementProposal.vue'
import { useDataStore } from '../stores/data'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/impr-prop',
      name: 'imprProp',
      component: ImprovementProposal,
      meta: { requiresAuth: true }
    },
    {
      path: '/work-units',
      name: 'workUnits',
      component: WorkUnits,
      meta: { requiresAuth: true }
    },
    {
      path: '/test',
      name: 'test',
      component: TestWorkUnitLR,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue')
    }
  ]
})

router.beforeEach((to, from, next) => {
  const store = useDataStore()
  const isAuthenticated = store.user?.token

  if (to.meta.requiresAuth) {
    if (!isAuthenticated) {
      next({ name: 'login', query: { message: `
      <h4>Logueja't</h4>
      <p>T'has de loguejar per a accedir a eixa pàgina.</p>`, redirectTo: to.path }})
    } else if (store.user.expires_date < new Date()) {
      next({ name: 'login', query: { message: `
      <h4>La teua sessió ha caducat</h4>
      <p>T'has de loguejar de nou per a accedir a eixa pàgina.</p>`, redirectTo: to.path }})
    } else {
      next()      
    }
  } else {
    next()
  }
})

export default router
