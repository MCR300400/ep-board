import { createRouter, createWebHistory } from 'vue-router'
import Home from './viste/Home.vue'
import Board from './viste/Board.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/board/:id', name: 'Board', component: Board },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
