import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LSsDefine from '../views/LSsDefine.vue'
import LSDevelop from '../views/LSDevelop.vue'
import LSsDevelopment from '../views/LSsDevelopment.vue'
import TestWorkUnitLR from '../views/TestWorkUnitLR.vue'
import LoginView from '../views/LoginView.vue'
import LoginIntranet from '../views/LoginIntranet.vue'
import ImprovementProposal from '../views/ImprovementProposal.vue'
import ContextSyllabus from '../views/ContextSyllabus.vue'
import SyllabusSchedule from '../views/SyllabusSchedule.vue'
import SyllabusQualify from '../views/SyllabusQualify.vue'
import FinalQualify from '../views/FinalQualify.vue'
import MethodologicalPrinciples from '../views/MethodologicalPrinciples.vue'
import ValidateSyllabus from '../views/ValidateSyllabus.vue'
import SyllabusesManage from '../views/SyllabusesManage.vue'
import ViewSyllabus from '../views/ViewSyllabus.vue'
import ContextPCC from '../views/pcc/ContextPCC.vue'
import FocusPCC from '../views/pcc/FocusPCC.vue'

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
      path: '/select/:cycleId/:moduleCode',
      name: 'selectedSyllabus',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/login/auth/:token',
      name: 'loginIntranet',
      component: LoginIntranet
    },
    {
      path: '/public/syllabus/:collegeCode/:cycleId/:moduleCode/:turn',
      name: 'viewSyllabus',
      component: ViewSyllabus,
      meta: { requiresAuth: false }
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
      name: 'LSsDefine',
      component: LSsDefine,
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
    },        
    {
      path: '/learning-situation/:lsId',
      name: 'LSDevelop',
      component: LSDevelop,
      props: true,
      meta: { requiresAuth: true }
    },    
    {
      path: '/schedule',
      name: 'SyllabusSchedule',
      component: SyllabusSchedule,
      meta: { requiresAuth: true }
    },   
    {
      path: '/qualify',
      name: 'SyllabusQualify',
      component: SyllabusQualify,
      meta: { requiresAuth: true }
    },   
    {
      path: '/final-qualify',
      name: 'FinalQualify',
      component: FinalQualify,
      meta: { requiresAuth: true }
    },  
    {
      path: '/method-principles',
      name: 'MethodologicalPrinciples',
      component: MethodologicalPrinciples,
      meta: { requiresAuth: true }
    }, 
    {
      path: '/validate',
      name: 'ValidateSyllabus',
      component: ValidateSyllabus,
      meta: { requiresAuth: true }
    }, 
    {
      path: '/syl-manage',
      name: 'SyllabusesManage',
      component: SyllabusesManage,
      meta: { requiresAuth: true }
    },
        {
      path: '/pcc/context',
      name: 'contextPCC',
      component: ContextPCC,
      meta: { requiresAuth: true }
    },
            {
      path: '/pcc/focus',
      name: 'focusPCC',
      component: FocusPCC,
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
    if (!['/', '/login'].includes(to.fullPath)) {
      localStorage.setItem('redirectPath', to.fullPath)
    }
    next({
      name: 'login',
      query: {
        message: `
            <p>Has d'introduir les credencials per accedir a aquesta pàgina.</p>`,
            redirectTo: to.path
      }
    })
  } else {
    next()
  }
})

export default router
