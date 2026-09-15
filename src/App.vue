<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Intestazione from './components/Intestazione.vue'

const route = useRoute()
const isBoard = computed(() => route.path.startsWith('/board/'))
</script>

<template>
  <div class="layout-app" :class="{ 'in-board': isBoard }">
    <Intestazione v-if="!isBoard" />

    <main :class="isBoard ? 'corpo-board' : 'contenitore corpo-principale'">
      <RouterView />
    </main>

    <footer v-if="!isBoard" class="footer">
      <div class="contenitore footer-interno">
        <p class="copyright">
          &copy; {{ new Date().getFullYear() }} ep-board — Real-time Multiplayer Architecture Whiteboard
        </p>
        <div class="link-footer">
          <a href="https://github.com/MCR300400" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://edoardopippi.dev" target="_blank" rel="noopener noreferrer">Portfolio</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: var(--bg-primario);
  color: var(--testo-primario);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  transition: background-color 0.25s ease, color 0.2s ease;
}

.contenitore {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.layout-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.layout-app.in-board {
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
}

.corpo-principale {
  flex: 1;
}

.corpo-board {
  flex: 1;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.footer {
  border-top: 1px solid var(--bordo-sottile);
  background-color: var(--bg-superficie);
  padding: 2rem 0;
  margin-top: auto;
}

.footer-interno {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.copyright {
  font-size: 0.85rem;
  color: var(--testo-terziario);
}

.link-footer {
  display: flex;
  gap: 1.5rem;
}

.link-footer a {
  color: var(--testo-secondario);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: color 0.15s ease;
}

.link-footer a:hover {
  color: var(--accento);
}
</style>
