const API = import.meta.env.VITE_API_URL
const SITO = 'board'
const CHIAVE = import.meta.env.VITE_CHIAVE_SITO

const sessione = crypto.randomUUID()
let inizio = Date.now()
let percorsoCorrente = location.pathname

function invia(dati, beacon = false) {
  if (!API) return
  const corpo = JSON.stringify({
    ...dati,
    sito_id: SITO,
    chiave: CHIAVE,
    sessione
  })
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(`${API}/eventi`, corpo)
  } else {
    fetch(`${API}/eventi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: corpo,
      keepalive: true
    }).catch(() => {})
  }
}

export function tracciaVista(percorso) {
  if (percorso !== percorsoCorrente) {
    invia({
      tipo: 'durata',
      percorso: percorsoCorrente,
      secondi: Math.round((Date.now() - inizio) / 1000)
    }, true)
    percorsoCorrente = percorso
    inizio = Date.now()
  }
  invia({
    tipo: 'view',
    percorso,
    referrer: document.referrer || null
  })
}

export function avviaTracciamentoDurata() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      invia({
        tipo: 'durata',
        percorso: percorsoCorrente,
        secondi: Math.round((Date.now() - inizio) / 1000)
      }, true)
    } else {
      inizio = Date.now()
    }
  })
}
