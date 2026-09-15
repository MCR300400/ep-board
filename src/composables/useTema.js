import { ref } from 'vue'

const TEMA_KEY = 'ep_tema'

function ottieniTemaIniziale() {
  if (typeof window === 'undefined') return 'dark'
  try {
    const salvato = localStorage.getItem(TEMA_KEY)
    if (salvato === 'light' || salvato === 'dark') return salvato
  } catch (e) {}
  return 'dark'
}

const tema = ref(ottieniTemaIniziale())

export function useTema() {
  function impostaTema(nuovoTema) {
    tema.value = nuovoTema
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', nuovoTema)
      try {
        localStorage.setItem(TEMA_KEY, nuovoTema)
      } catch (e) {}
    }
  }

  function toggleTema() {
    impostaTema(tema.value === 'dark' ? 'light' : 'dark')
  }

  return {
    tema,
    toggleTema,
    impostaTema
  }
}
