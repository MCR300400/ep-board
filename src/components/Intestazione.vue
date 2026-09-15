<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useTema } from '../composables/useTema'

const { tema, toggleTema } = useTema()
const router = useRouter()

const menuAperto = ref(false)

function toggleMenu() {
  menuAperto.value = !menuAperto.value
}

function chiudiMenu() {
  menuAperto.value = false
}

function gestisciTasti(e) {
  if (e.key === 'Escape' && menuAperto.value) {
    chiudiMenu()
  }
}

function gestisciResize() {
  if (window.innerWidth > 768 && menuAperto.value) {
    chiudiMenu()
  }
}

watch(menuAperto, (aperto) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = aperto ? 'hidden' : ''
  }
})

onMounted(() => {
  window.addEventListener('keydown', gestisciTasti)
  window.addEventListener('resize', gestisciResize)
  router.afterEach(() => {
    chiudiMenu()
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', gestisciTasti)
  window.removeEventListener('resize', gestisciResize)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <header class="header">
    <div class="contenitore header-interno">
      <!-- Logo -->
      <RouterLink to="/" class="logo" @click="chiudiMenu">
        <span class="logo-icona">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </span>
        <span class="logo-nome">ep-board</span>
      </RouterLink>

      <!-- Navigazione Desktop (Visibile SOLO su desktop > 768px) -->
      <nav class="nav-desktop">
        <RouterLink to="/" class="nav-link">Home</RouterLink>
        <a href="#caratteristiche" class="nav-link">Funzionalità</a>
        <a href="#architetture" class="nav-link">Blocchi Architettura</a>
      </nav>

      <!-- Extra Desktop (Pulsante Tema) -->
      <div class="extra-desktop">
        <button
          type="button"
          class="pulsante-tema-desktop"
          :aria-label="tema === 'dark' ? 'Attiva tema chiaro' : 'Attiva tema scuro'"
          :title="tema === 'dark' ? 'Tema attuale: Scuro. Clicca per Chiaro' : 'Tema attuale: Chiaro. Clicca per Scuro'"
          @click="toggleTema"
        >
          <span class="icona-involucro">
            <svg
              v-if="tema === 'dark'"
              xmlns="http://www.w3.org/2000/svg"
              class="icona-svg sole"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2"></path>
              <path d="M12 20v2"></path>
              <path d="m4.93 4.93 1.41 1.41"></path>
              <path d="m17.66 17.66 1.41 1.41"></path>
              <path d="M2 12h2"></path>
              <path d="M20 12h2"></path>
              <path d="m6.34 17.66-1.41 1.41"></path>
              <path d="m19.07 4.93-1.41 1.41"></path>
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="icona-svg luna"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
            </svg>
          </span>
          <span class="testo-tema">{{ tema === 'dark' ? 'Chiaro' : 'Scuro' }}</span>
        </button>
      </div>

      <!-- Bottone Menu Mobile (Solo <= 768px) -->
      <button
        type="button"
        class="btn-menu-mobile"
        :class="{ aperto: menuAperto }"
        :aria-expanded="menuAperto"
        aria-label="Menu di navigazione"
        @click="toggleMenu"
      >
        <span class="scatola-hamburger">
          <span class="barra-linea barra-superiore"></span>
          <span class="barra-linea barra-inferiore"></span>
        </span>
        <span class="testo-menu">{{ menuAperto ? 'Chiudi' : 'Menu' }}</span>
      </button>
    </div>

    <!-- Pannello Mobile a Scomparsa -->
    <transition name="drawer">
      <div v-if="menuAperto" class="pannello-mobile">
        <div class="contenitore menu-interno">
          <div class="menu-sezione-testata">
            <span class="etichetta-sezione">Navigazione</span>
          </div>

          <nav class="nav-lista-mobile">
            <RouterLink to="/" class="nav-card" @click="chiudiMenu">
              <div class="nav-card-info">
                <span class="nav-card-num">01</span>
                <span class="nav-card-nome">Home</span>
              </div>
              <span class="nav-card-freccia">&rarr;</span>
            </RouterLink>

            <a href="#caratteristiche" class="nav-card" @click="chiudiMenu">
              <div class="nav-card-info">
                <span class="nav-card-num">02</span>
                <span class="nav-card-nome">Funzionalità Lavagna</span>
              </div>
              <span class="nav-card-freccia">&rarr;</span>
            </a>

            <a href="#architetture" class="nav-card" @click="chiudiMenu">
              <div class="nav-card-info">
                <span class="nav-card-num">03</span>
                <span class="nav-card-nome">Blocchi Architettura</span>
              </div>
              <span class="nav-card-freccia">&rarr;</span>
            </a>
          </nav>

          <div class="divisorio-sottile"></div>

          <!-- Azioni Rapide nel Menu Mobile -->
          <div class="menu-azioni-mobile">
            <button
              type="button"
              class="btn-tema-drawer"
              :aria-label="tema === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'"
              @click="toggleTema"
            >
              <span class="icona-involucro">
                <svg
                  v-if="tema === 'dark'"
                  xmlns="http://www.w3.org/2000/svg"
                  class="icona-svg sole"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2"></path>
                  <path d="M12 20v2"></path>
                  <path d="m4.93 4.93 1.41 1.41"></path>
                  <path d="m17.66 17.66 1.41 1.41"></path>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="m6.34 17.66-1.41 1.41"></path>
                  <path d="m19.07 4.93-1.41 1.41"></path>
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  class="icona-svg luna"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                </svg>
              </span>
              <span class="testo-btn-tema">{{ tema === 'dark' ? 'Tema Chiaro' : 'Tema Scuro' }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Backdrop Overlay -->
    <transition name="fade">
      <div v-if="menuAperto" class="overlay-backdrop" @click="chiudiMenu"></div>
    </transition>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--header-bg);
  border-bottom: 1px solid var(--bordo-sottile);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: background-color 0.25s ease, border-color 0.25s ease;
}

.header-interno {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 4.25rem;
  padding: 0 1.5rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  color: var(--testo-primario);
  font-weight: 750;
  font-size: 1.05rem;
  letter-spacing: -0.015em;
}

.logo-icona {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accento), #ea580c);
  color: #ffffff;
  box-shadow: 0 2px 10px var(--accento-sfondo-forte);
}

.nav-desktop {
  display: flex;
  align-items: center;
  gap: 1.75rem;
}

.nav-link {
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 550;
  color: var(--testo-secondario);
  transition: color 0.15s ease;
  position: relative;
  padding: 0.35rem 0;
}

.nav-link:hover {
  color: var(--accento);
}

.nav-link.router-link-active {
  color: var(--testo-primario);
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--accento);
  border-radius: 2px;
}

.extra-desktop {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.pulsante-tema-desktop {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 2.15rem;
  padding: 0 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--bordo-medio);
  background: var(--bg-superficie);
  color: var(--testo-secondario);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: all 0.18s ease;
  user-select: none;
}

.pulsante-tema-desktop:hover {
  color: var(--accento);
  border-color: var(--accento-bordo);
  background: var(--bg-superficie-elevata);
}

.icona-involucro {
  display: flex;
  align-items: center;
  justify-content: center;
}

.icona-svg {
  width: 15px;
  height: 15px;
  transition: transform 0.25s ease;
}

.pulsante-tema-desktop:hover .icona-svg.sole {
  transform: rotate(45deg);
}

.pulsante-tema-desktop:hover .icona-svg.luna {
  transform: rotate(-15deg);
}

/* Menu Mobile */
.btn-menu-mobile {
  display: none;
  align-items: center;
  gap: 0.6rem;
  height: 2.35rem;
  padding: 0 0.85rem;
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  border-radius: 9px;
  color: var(--testo-primario);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.btn-menu-mobile:hover,
.btn-menu-mobile.aperto {
  border-color: var(--accento-bordo);
  color: var(--accento);
  background: var(--bg-superficie-elevata);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.btn-menu-mobile:active {
  transform: scale(0.95);
}

.scatola-hamburger {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
  gap: 5px;
  width: 18px;
  height: 14px;
  position: relative;
}

.barra-linea {
  display: block;
  height: 1.8px;
  background-color: currentColor;
  border-radius: 9999px;
  transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}

.barra-superiore {
  width: 18px;
}

.barra-inferiore {
  width: 12px;
}

.btn-menu-mobile:hover .barra-inferiore {
  width: 18px;
}

.btn-menu-mobile.aperto .barra-superiore {
  width: 18px;
  transform: translateY(3.4px) rotate(45deg);
}

.btn-menu-mobile.aperto .barra-inferiore {
  width: 18px;
  transform: translateY(-3.4px) rotate(-45deg);
}

/* Floating Drawer */
.pannello-mobile {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-superficie);
  border-bottom: 1px solid var(--bordo-medio);
  border-radius: 0 0 22px 22px;
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.45);
  z-index: 60;
  overflow: hidden;
}

.menu-interno {
  padding: 1.4rem 1.25rem 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.menu-sezione-testata {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.4rem;
}

.etichetta-sezione {
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--testo-terziario);
}

.nav-lista-mobile {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.nav-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  text-decoration: none;
  background: var(--bg-primario);
  border: 1px solid var(--bordo-sottile);
  border-radius: 10px;
  transition: all 0.18s ease;
}

.nav-card-info {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.nav-card-num {
  font-size: 0.75rem;
  font-weight: 750;
  color: var(--accento);
  font-family: ui-monospace, monospace;
}

.nav-card-nome {
  font-size: 1rem;
  font-weight: 650;
  color: var(--testo-primario);
  letter-spacing: -0.01em;
}

.nav-card-freccia {
  font-size: 1.1rem;
  color: var(--testo-terziario);
  transition: transform 0.18s ease, color 0.18s ease;
}

.nav-card:hover {
  background: var(--bg-superficie-elevata);
  border-color: var(--accento-bordo);
}

.nav-card:hover .nav-card-freccia {
  transform: translateX(4px);
  color: var(--accento);
}

.divisorio-sottile {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--bordo-medio), transparent);
  margin: 0.25rem 0;
}

.menu-azioni-mobile {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 0.25rem;
}

.btn-tema-drawer {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.25rem;
  padding: 0 0.9rem;
  border-radius: 9999px;
  border: 1px solid var(--bordo-medio);
  background: var(--bg-superficie-elevata);
  color: var(--testo-primario);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  transition: all 0.18s ease;
  user-select: none;
}

.overlay-backdrop {
  position: fixed;
  top: 4.25rem;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 55;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.26s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .nav-desktop,
  .extra-desktop {
    display: none;
  }
  .btn-menu-mobile {
    display: inline-flex;
  }
  .pannello-mobile {
    display: block;
  }
}
</style>
