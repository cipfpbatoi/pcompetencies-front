<script>
import { useDataStore } from '@/stores/data'
import { mapState, mapActions } from 'pinia'

export default {
  computed: {
    ...mapState(useDataStore, ['user']),
    isAdminOrHeadOfDepartament() {
      return (
        this.user.info?.roles.includes('ROLE_HEAD_DEPARTMENT') ||
        this.user.info?.roles.includes('ROLE_ADMIN') ||
        this.user.info?.roles.includes('ROLE_COORDINADOR_FCT')
      )
    },
    canManageIndividualTrainingPlans() {
      return (
        this.user.info?.roles.includes('ROLE_ADMIN') ||
        this.user.info?.roles.includes('ROLE_COORDINADOR_FCT')
      )
    },
    canManagePcc() {
      return (
        this.user.info?.roles.includes('ROLE_ADMIN') ||
        this.user.info?.roles.includes('ROLE_DEVELOPER')
      )
    },
    isLogged() {
      return this.user.token
    },
    getUserInfo() {
      return this.user.info
    },
    isloginPage() {
      return window.location.pathname.startsWith('/login')
    }
  },
  methods: {
    ...mapActions(useDataStore, ['logoutUser']),
    logout(ev) {
      if (confirm('Vas a tancar la teua sessió')) {
        this.logoutUser()
        this.$router.push('/login')
      } else {
        ev.preventDefault()
        ev.stopPropagation()
      }
    }
  }
}
</script>

<template>
  <p class="text-center text-lg-end text-secondary" v-if="getUserInfo">
    Hola
    <span class="fw-bold m-0 p-0">{{ getUserInfo.name + ' ' + getUserInfo.surname }}</span>
    <span class="text-secondary"> ({{ getUserInfo.department.shortName }})</span>
    ·
    <span class="link-primary">
      <RouterLink @click.prevent="logout" to="/login">
        <i class="bi bi-box-arrow-right me-1"></i>Eixir
      </RouterLink>
    </span>
  </p>
  <nav class="navbar justify-content-lg-end justify-content-center">
    <ul class="nav text-center justify-content-lg-end justify-content-center">
      <li class="nav-item">
        <RouterLink class="nav-link" active-class="active" to="/">
          <i class="bi bi-house-door me-1"></i>Inici
        </RouterLink>
      </li>
      <template v-if="isLogged">
        <li class="nav-item dropdown" v-if="isAdminOrHeadOfDepartament">
          <a
            class="nav-link dropdown-toggle"
            href="#"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i class="bi bi-gear-fill me-1"></i>Gestió
          </a>
          <ul class="dropdown-menu">
            <li><h6 class="dropdown-header">Programacions</h6></li>
            <li>
              <RouterLink class="dropdown-item" active-class="active" to="/syl-manage">
                <i class="bi bi-journal-text me-2"></i>Gestionar programacions
              </RouterLink>
            </li>

            <template v-if="canManagePcc || user.info?.roles.includes('ROLE_ADMIN')">
              <li><hr class="dropdown-divider" /></li>
              <li><h6 class="dropdown-header">Projectes curriculars (PCC)</h6></li>
              <li v-if="canManagePcc">
                <RouterLink class="dropdown-item" active-class="active" to="/pcc/manage">
                  <i class="bi bi-folder2-open me-2"></i>Gestionar projectes curriculars
                </RouterLink>
              </li>
              <li v-if="user.info?.roles.includes('ROLE_ADMIN')">
                <RouterLink class="dropdown-item" active-class="active" to="/pcc/stats">
                  <i class="bi bi-bar-chart-line me-2"></i>Estadistiques PCC
                </RouterLink>
              </li>
            </template>

            <template v-if="canManageIndividualTrainingPlans">
              <li><hr class="dropdown-divider" /></li>
              <li><h6 class="dropdown-header">Plans Formatius Individuals</h6></li>
              <li>
                <RouterLink
                  class="dropdown-item"
                  active-class="active"
                  to="/individual-training-plans/manage"
                >
                  <i class="bi bi-mortarboard-fill me-2"></i>Plans Formatius Individuals
                </RouterLink>
              </li>
              <li>
                <RouterLink
                  class="dropdown-item"
                  active-class="active"
                  to="/individual-training-plans/stats"
                >
                  <i class="bi bi-graph-up me-2"></i>Estadistiques Plans Formatius Individuals
                </RouterLink>
              </li>
            </template>
          </ul>
        </li>
      </template>
      <template v-else>
        <li class="nav-item" v-if="!isloginPage">
          <RouterLink class="nav-link" active-class="active" to="/login">
            <i class="bi bi-box-arrow-in-right me-1"></i>Entrar
          </RouterLink>
        </li>
      </template>
      <li class="nav-item">
        <RouterLink class="nav-link" active-class="active" to="/about">
          <i class="bi bi-info-circle me-1"></i>Sobre Nosaltres
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
