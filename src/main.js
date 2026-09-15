import { createApp } from 'vue'
import './assets/tema.css'
import App from './App.vue'
import router from './router'
import { tracciaVista, avviaTracciamentoDurata } from './analytics'

router.afterEach(to => tracciaVista(to.path))
avviaTracciamentoDurata()

createApp(App).use(router).mount('#app')
