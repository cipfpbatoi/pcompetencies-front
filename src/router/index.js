import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import WorkUnits from '../views/WorkUnits.vue'
import TestWorkUnitLR from '../views/TestWorkUnitLR.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/work-units',
      name: 'workUnits',
      component: WorkUnits,
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

export default router
