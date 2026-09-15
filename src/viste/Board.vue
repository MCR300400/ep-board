<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTema } from '../composables/useTema'

const route = useRoute()
const router = useRouter()
const { tema, toggleTema } = useTema()

const roomId = computed(() => route.params.id || 'arch-101')
const boardTitle = ref(`Architettura ${roomId.value}`)
const isEditingTitle = ref(false)
const titleInputRef = ref(null)

// Utente locale
const myId = ref(crypto.randomUUID().slice(0, 8))
const myName = ref(localStorage.getItem('ep_board_username') || `Dev-${Math.floor(Math.random() * 899) + 100}`)
const myColor = ref(['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'][Math.floor(Math.random() * 7)])

// WebSocket e Multiplayer
const ws = ref(null)
const wsConnesso = ref(false)
const peers = reactive(new Map()) // peerId -> { id, name, color, cursor: { x, y } }
const lastCursorSend = ref(0)
const linkCopiato = ref(false)

// Canvas Pan & Zoom
const pan = reactive({ x: 0, y: 0 })
const zoom = ref(1)
const isPanning = ref(false)
const panStart = reactive({ x: 0, y: 0 })
const spacePremuto = ref(false)

// Strumenti e Stato di Disegno
const strumentoAttivo = ref('select') // 'select' | 'pan' | 'pen' | 'rect' | 'circle' | 'diamond' | 'arrow' | 'text' | 'sticky' | 'arch'
const archTipoAttivo = ref('server') // 'client' | 'server' | 'database' | 'cache' | 'queue' | 'cloud'
const menuArchAperto = ref(false)

// Proprietà di stile predefinite
const coloreTratto = ref('#f97316')
const spessoreTratto = ref(2)
const tipoRiempimento = ref('subtle') // 'none' | 'subtle' | 'solid'
const coloreSticky = ref('#fef08a') // giallo chiaro

// Elementi della lavagna
const elementi = ref([])
const elementoSelezionatoId = ref(null)
const elementoInCreazione = ref(null)
const staDisegnando = ref(false)
const staTrascinandoElemento = ref(false)
const puntoInizioDrag = reactive({ x: 0, y: 0 })
const posInizialiElemento = reactive({ x: 0, y: 0 })

// Editing del testo inline
const testoInModifica = ref(null) // { id, testo }

// Storico per Undo / Redo
const storicoUndo = ref([])
const storicoRedo = ref([])

function salvaStatoNelUndo() {
  storicoUndo.value.push(JSON.stringify(elementi.value))
  if (storicoUndo.value.length > 30) storicoUndo.value.shift()
  storicoRedo.value = []
}

function undo() {
  if (!storicoUndo.value.length) return
  storicoRedo.value.push(JSON.stringify(elementi.value))
  const prec = storicoUndo.value.pop()
  elementi.value = JSON.parse(prec)
  inviaMessaggio({ type: 'board-sync', elements: elementi.value })
}

function redo() {
  if (!storicoRedo.value.length) return
  storicoUndo.value.push(JSON.stringify(elementi.value))
  const succ = storicoRedo.value.pop()
  elementi.value = JSON.parse(succ)
  inviaMessaggio({ type: 'board-sync', elements: elementi.value })
}

// Coordinate Helpers: Schermo <-> Canvas World
function schermoVersoMondo(clientX, clientY) {
  const rett = svgRef.value ? svgRef.value.getBoundingClientRect() : { left: 0, top: 0 }
  return {
    x: (clientX - rett.left - pan.x) / zoom.value,
    y: (clientY - rett.top - pan.y) / zoom.value
  }
}

// Archetipi per blocchi di architettura
const tipiArch = {
  client: {
    nome: 'Client / App',
    sub: 'Frontend / Browser',
    icona: '🌐',
    colore: '#3b82f6',
    bordo: '#60a5fa'
  },
  server: {
    nome: 'API / Service',
    sub: 'Backend Microservice',
    icona: '⚙️',
    colore: '#10b981',
    bordo: '#34d399'
  },
  database: {
    nome: 'Database D1',
    sub: 'Relational SQLite',
    icona: '🗄️',
    colore: '#8b5cf6',
    bordo: '#a78bfa'
  },
  cache: {
    nome: 'Cache KV',
    sub: 'In-Memory / Low Latency',
    icona: '⚡',
    colore: '#f59e0b',
    bordo: '#fbbf24'
  },
  queue: {
    nome: 'Queue Eventi',
    sub: 'Message Broker / Async',
    icona: '📬',
    colore: '#ec4899',
    bordo: '#f472b6'
  },
  cloud: {
    nome: 'Cloudflare Worker',
    sub: 'Global Edge Runtime',
    icona: '☁️',
    colore: '#f97316',
    bordo: '#fb923c'
  }
}

// Palette di colori
const paletteColori = [
  '#f97316', // Arancione Accento
  '#3b82f6', // Blu
  '#10b981', // Smeraldo
  '#8b5cf6', // Viola
  '#ec4899', // Rosa
  '#eab308', // Giallo
  '#94a3b8', // Grigio ardesia
  '#ffffff', // Bianco
  '#121316'  // Grafite
]

const paletteSticky = [
  { colore: '#fef08a', etichetta: 'Giallo' },
  { colore: '#fed7aa', etichetta: 'Arancio' },
  { colore: '#bbf7d0', etichetta: 'Verde' },
  { colore: '#bae6fd', etichetta: 'Azzurro' },
  { colore: '#fbcfe8', etichetta: 'Rosa' },
  { colore: '#22242c', etichetta: 'Scuro' }
]

// Gestione Connessione WebSocket
const wsEndpoint = computed(() => {
  const base = import.meta.env.VITE_WS_URL || 'wss://ep-ws.edoardopippi00.workers.dev'
  return `${base}/ws?room=${encodeURIComponent(roomId.value)}&app=board`
})

function inviaMessaggio(msg) {
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    try {
      ws.value.send(JSON.stringify(msg))
    } catch (err) {
      console.error('Errore invio WebSocket', err)
    }
  }
}

function connettiWebSocket() {
  try {
    ws.value = new WebSocket(wsEndpoint.value)

    ws.value.onopen = () => {
      wsConnesso.value = true
      // Invia join presence
      inviaMessaggio({
        type: 'user-joined',
        user: { id: myId.value, name: myName.value, color: myColor.value }
      })
    }

    ws.value.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        gestisciMessaggioWS(msg)
      } catch (err) {}
    }

    ws.value.onclose = () => {
      wsConnesso.value = false
      setTimeout(() => {
        if (route.name === 'Board') connettiWebSocket()
      }, 3000)
    }

    ws.value.onerror = () => {
      wsConnesso.value = false
    }
  } catch (e) {
    console.error('Errore creazione WebSocket', e)
  }
}

function gestisciMessaggioWS(msg) {
  const senderId = msg._sender

  if (msg.type === 'user-joined') {
    // Un nuovo peer si è unito: registralo
    if (msg.user) {
      peers.set(senderId, {
        id: msg.user.id || senderId,
        name: msg.user.name || 'Collaboratore',
        color: msg.user.color || '#3b82f6',
        cursor: null
      })
      // Rispondi con la nostra presenza
      inviaMessaggio({
        type: 'user-presence',
        user: { id: myId.value, name: myName.value, color: myColor.value },
        to: senderId
      })
      // Se abbiamo elementi, inviamo uno snapshot al nuovo partecipante
      if (elementi.value.length > 0) {
        inviaMessaggio({
          type: 'board-sync',
          elements: elementi.value,
          to: senderId
        })
      }
    }
  } else if (msg.type === 'user-presence') {
    if (msg.user) {
      peers.set(senderId, {
        id: msg.user.id || senderId,
        name: msg.user.name || 'Collaboratore',
        color: msg.user.color || '#3b82f6',
        cursor: peers.get(senderId)?.cursor || null
      })
    }
  } else if (msg.type === 'peer-left') {
    peers.delete(msg.peerId || senderId)
  } else if (msg.type === 'cursor') {
    const peer = peers.get(senderId)
    if (peer) {
      peer.cursor = { x: msg.x, y: msg.y }
    } else if (msg.user) {
      peers.set(senderId, {
        id: msg.user.id || senderId,
        name: msg.user.name || 'Collaboratore',
        color: msg.user.color || '#3b82f6',
        cursor: { x: msg.x, y: msg.y }
      })
    }
  } else if (msg.type === 'elem-create') {
    if (msg.element && !elementi.value.find(e => e.id === msg.element.id)) {
      elementi.value.push(msg.element)
    }
  } else if (msg.type === 'elem-update') {
    if (msg.element) {
      const idx = elementi.value.findIndex(e => e.id === msg.element.id)
      if (idx !== -1) {
        elementi.value[idx] = msg.element
      } else {
        elementi.value.push(msg.element)
      }
    }
  } else if (msg.type === 'elem-delete') {
    elementi.value = elementi.value.filter(e => e.id !== msg.id)
  } else if (msg.type === 'board-sync') {
    if (Array.isArray(msg.elements)) {
      // Se la lavagna locale è vuota o ha meno elementi, sincronizza
      if (elementi.value.length === 0 || msg.elements.length > elementi.value.length) {
        elementi.value = msg.elements
      }
    }
  } else if (msg.type === 'board-clear') {
    elementi.value = []
  }
}

// Invia posizione cursore locale (throttled)
function inviaCursoreLocale(worldX, worldY) {
  const ora = Date.now()
  if (ora - lastCursorSend.value > 40) { // ~25 fps per multiplayer ultra-fluido senza saturazione
    lastCursorSend.value = ora
    inviaMessaggio({
      type: 'cursor',
      x: Math.round(worldX),
      y: Math.round(worldY),
      user: { id: myId.value, name: myName.value, color: myColor.value }
    })
  }
}

// Riferimenti DOM
const svgRef = ref(null)

// Gestione Pointer Events sul Canvas
function onPointerDown(e) {
  // Ignora se si clicca con tasti secondari diversi dal pan
  if (e.button === 1 || spacePremuto.value || strumentoAttivo.value === 'pan') {
    isPanning.value = true
    panStart.x = e.clientX - pan.x
    panStart.y = e.clientY - pan.y
    return
  }

  if (e.button !== 0) return // Solo tasto sinistro

  const world = schermoVersoMondo(e.clientX, e.clientY)

  if (strumentoAttivo.value === 'select') {
    // Clicca sullo sfondo: deseleziona se non si è cliccato su un elemento
    const target = e.target
    if (target === svgRef.value || target.classList.contains('canvas-background')) {
      elementoSelezionatoId.value = null
    }
    return
  }

  // Creazione nuovo elemento
  staDisegnando.value = true
  salvaStatoNelUndo()

  const id = `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  if (strumentoAttivo.value === 'pen') {
    elementoInCreazione.value = {
      id,
      type: 'pen',
      points: [{ x: world.x, y: world.y }],
      stroke: coloreTratto.value,
      strokeWidth: spessoreTratto.value
    }
  } else if (strumentoAttivo.value === 'rect') {
    elementoInCreazione.value = {
      id,
      type: 'rect',
      x: world.x,
      y: world.y,
      w: 0,
      h: 0,
      stroke: coloreTratto.value,
      strokeWidth: spessoreTratto.value,
      fillType: tipoRiempimento.value
    }
  } else if (strumentoAttivo.value === 'circle') {
    elementoInCreazione.value = {
      id,
      type: 'circle',
      cx: world.x,
      cy: world.y,
      rx: 0,
      ry: 0,
      stroke: coloreTratto.value,
      strokeWidth: spessoreTratto.value,
      fillType: tipoRiempimento.value
    }
  } else if (strumentoAttivo.value === 'diamond') {
    elementoInCreazione.value = {
      id,
      type: 'diamond',
      x: world.x,
      y: world.y,
      w: 0,
      h: 0,
      stroke: coloreTratto.value,
      strokeWidth: spessoreTratto.value,
      fillType: tipoRiempimento.value
    }
  } else if (strumentoAttivo.value === 'arrow') {
    elementoInCreazione.value = {
      id,
      type: 'arrow',
      x1: world.x,
      y1: world.y,
      x2: world.x,
      y2: world.y,
      stroke: coloreTratto.value,
      strokeWidth: spessoreTratto.value
    }
  } else if (strumentoAttivo.value === 'text') {
    const el = {
      id,
      type: 'text',
      x: world.x,
      y: world.y,
      text: 'Doppio click per modificare',
      fontSize: 16,
      stroke: coloreTratto.value
    }
    elementi.value.push(el)
    inviaMessaggio({ type: 'elem-create', element: el })
    staDisegnando.value = false
    elementoSelezionatoId.value = id
    strumentoAttivo.value = 'select'
  } else if (strumentoAttivo.value === 'sticky') {
    const el = {
      id,
      type: 'sticky',
      x: world.x - 80,
      y: world.y - 80,
      w: 160,
      h: 160,
      text: 'Nuova nota...',
      bg: coloreSticky.value,
      textColor: coloreSticky.value === '#22242c' ? '#f4f4f5' : '#18181b'
    }
    elementi.value.push(el)
    inviaMessaggio({ type: 'elem-create', element: el })
    staDisegnando.value = false
    elementoSelezionatoId.value = id
    strumentoAttivo.value = 'select'
  } else if (strumentoAttivo.value === 'arch') {
    const arch = tipiArch[archTipoAttivo.value] || tipiArch.server
    const el = {
      id,
      type: 'arch',
      archType: archTipoAttivo.value,
      x: world.x - 90,
      y: world.y - 50,
      w: 180,
      h: 100,
      title: arch.nome,
      subtitle: arch.sub,
      icon: arch.icona,
      color: arch.colore,
      borderColor: arch.bordo
    }
    elementi.value.push(el)
    inviaMessaggio({ type: 'elem-create', element: el })
    staDisegnando.value = false
    elementoSelezionatoId.value = id
    strumentoAttivo.value = 'select'
  }
}

function onPointerMove(e) {
  if (isPanning.value) {
    pan.x = e.clientX - panStart.x
    pan.y = e.clientY - panStart.y
    return
  }

  const world = schermoVersoMondo(e.clientX, e.clientY)
  inviaCursoreLocale(world.x, world.y)

  if (staTrascinandoElemento.value && elementoSelezionatoId.value) {
    const el = elementi.value.find(e => e.id === elementoSelezionatoId.value)
    if (el) {
      const dx = world.x - puntoInizioDrag.x
      const dy = world.y - puntoInizioDrag.y

      if (el.type === 'arrow') {
        el.x1 = posInizialiElemento.x1 + dx
        el.y1 = posInizialiElemento.y1 + dy
        el.x2 = posInizialiElemento.x2 + dx
        el.y2 = posInizialiElemento.y2 + dy
      } else if (el.type === 'circle') {
        el.cx = posInizialiElemento.cx + dx
        el.cy = posInizialiElemento.cy + dy
      } else if (el.type === 'pen') {
        // Sposta tutti i punti della penna
        el.points = posInizialiElemento.points.map(p => ({
          x: p.x + dx,
          y: p.y + dy
        }))
      } else {
        el.x = posInizialiElemento.x + dx
        el.y = posInizialiElemento.y + dy
      }
    }
    return
  }

  if (!staDisegnando.value || !elementoInCreazione.value) return

  const el = elementoInCreazione.value

  if (el.type === 'pen') {
    el.points.push({ x: world.x, y: world.y })
  } else if (el.type === 'rect' || el.type === 'diamond') {
    el.w = world.x - el.x
    el.h = world.y - el.y
  } else if (el.type === 'circle') {
    el.rx = Math.abs(world.x - el.cx)
    el.ry = Math.abs(world.y - el.cy)
  } else if (el.type === 'arrow') {
    el.x2 = world.x
    el.y2 = world.y
  }
}

function onPointerUp(e) {
  if (isPanning.value) {
    isPanning.value = false
    return
  }

  if (staTrascinandoElemento.value && elementoSelezionatoId.value) {
    staTrascinandoElemento.value = false
    const el = elementi.value.find(item => item.id === elementoSelezionatoId.value)
    if (el) {
      inviaMessaggio({ type: 'elem-update', element: el })
    }
    return
  }

  if (staDisegnando.value && elementoInCreazione.value) {
    staDisegnando.value = false
    const el = { ...elementoInCreazione.value }

    // Normalizza dimensioni rettangolo se disegnato all'indietro
    if (el.type === 'rect' || el.type === 'diamond') {
      if (el.w < 0) {
        el.x += el.w
        el.w = Math.abs(el.w)
      }
      if (el.h < 0) {
        el.y += el.h
        el.h = Math.abs(el.h)
      }
      // Se troppo piccolo, dagli una dimensione minima
      if (el.w < 10) el.w = 40
      if (el.h < 10) el.h = 40
    }

    elementi.value.push(el)
    inviaMessaggio({ type: 'elem-create', element: el })
    elementoInCreazione.value = null
    elementoSelezionatoId.value = el.id

    // Torna a select dopo aver disegnato una forma
    if (strumentoAttivo.value !== 'pen') {
      strumentoAttivo.value = 'select'
    }
  }
}

// Drag & Selezione di un elemento esistente
function selezionaElemento(e, el) {
  if (strumentoAttivo.value === 'pan' || spacePremuto.value) return

  if (strumentoAttivo.value === 'select') {
    e.stopPropagation()
    elementoSelezionatoId.value = el.id
    staTrascinandoElemento.value = true

    const world = schermoVersoMondo(e.clientX, e.clientY)
    puntoInizioDrag.x = world.x
    puntoInizioDrag.y = world.y

    if (el.type === 'arrow') {
      posInizialiElemento.x1 = el.x1
      posInizialiElemento.y1 = el.y1
      posInizialiElemento.x2 = el.x2
      posInizialiElemento.y2 = el.y2
    } else if (el.type === 'circle') {
      posInizialiElemento.cx = el.cx
      posInizialiElemento.cy = el.cy
    } else if (el.type === 'pen') {
      posInizialiElemento.points = el.points.map(p => ({ ...p }))
    } else {
      posInizialiElemento.x = el.x
      posInizialiElemento.y = el.y
    }
  }
}

// Gestione Zoom con Rotella del Mouse
function onWheel(e) {
  e.preventDefault()
  const factor = e.deltaY < 0 ? 1.12 : 0.89
  const oldZoom = zoom.value
  const newZoom = Math.min(Math.max(oldZoom * factor, 0.2), 3.5)

  const rett = svgRef.value.getBoundingClientRect()
  const mouseX = e.clientX - rett.left
  const mouseY = e.clientY - rett.top

  pan.x = mouseX - (mouseX - pan.x) * (newZoom / oldZoom)
  pan.y = mouseY - (mouseY - pan.y) * (newZoom / oldZoom)
  zoom.value = newZoom
}

// Comandi di Zoom manuali
function zoomIn() {
  const newZoom = Math.min(zoom.value * 1.25, 3.5)
  zoom.value = newZoom
}

function zoomOut() {
  const newZoom = Math.max(zoom.value / 1.25, 0.2)
  zoom.value = newZoom
}

function resetVista() {
  zoom.value = 1
  pan.x = 0
  pan.y = 0
}

// Eliminazione elemento selezionato
function eliminaSelezionato() {
  if (!elementoSelezionatoId.value) return
  salvaStatoNelUndo()
  const id = elementoSelezionatoId.value
  elementi.value = elementi.value.filter(e => e.id !== id)
  inviaMessaggio({ type: 'elem-delete', id })
  elementoSelezionatoId.value = null
}

// Pulisci lavagna intera
function pulisciLavagna() {
  if (!confirm('Vuoi davvero cancellare tutti gli elementi della lavagna?')) return
  salvaStatoNelUndo()
  elementi.value = []
  inviaMessaggio({ type: 'board-clear' })
}

// Doppio click per modifica testo
function apriModificaTesto(el) {
  if (el.type === 'text' || el.type === 'sticky') {
    testoInModifica.value = {
      id: el.id,
      text: el.text
    }
  } else if (el.type === 'arch') {
    const nuovoTitolo = prompt('Nome del componente:', el.title)
    if (nuovoTitolo !== null && nuovoTitolo.trim()) {
      el.title = nuovoTitolo.trim()
      const nuovoSub = prompt('Sottotitolo / Ruolo:', el.subtitle)
      if (nuovoSub !== null) el.subtitle = nuovoSub.trim()
      inviaMessaggio({ type: 'elem-update', element: el })
    }
  }
}

function salvaTestoInModifica() {
  if (!testoInModifica.value) return
  const el = elementi.value.find(e => e.id === testoInModifica.value.id)
  if (el) {
    el.text = testoInModifica.value.text || ' '
    inviaMessaggio({ type: 'elem-update', element: el })
  }
  testoInModifica.value = null
}

// Helper percorso penna SVG levigato
function generaPathPenna(punti) {
  if (!punti || punti.length === 0) return ''
  if (punti.length === 1) return `M ${punti[0].x} ${punti[0].y} L ${punti[0].x + 0.5} ${punti[0].y + 0.5}`

  let d = `M ${punti[0].x} ${punti[0].y}`
  for (let i = 1; i < punti.length - 1; i++) {
    const xc = (punti[i].x + punti[i + 1].x) / 2
    const yc = (punti[i].y + punti[i + 1].y) / 2
    d += ` Q ${punti[i].x} ${punti[i].y}, ${xc} ${yc}`
  }
  const ultimo = punti[punti.length - 1]
  d += ` L ${ultimo.x} ${ultimo.y}`
  return d
}

// Helper calcolo punti rombo
function calcolaPuntiRombo(x, y, w, h) {
  const metaW = w / 2
  const metaH = h / 2
  return `${x + metaW},${y} ${x + w},${y + metaH} ${x + metaW},${y + h} ${x},${y + metaH}`
}

// Helper per calcolo bounding box di selezione
const bboxSelezionato = computed(() => {
  if (!elementoSelezionatoId.value) return null
  const el = elementi.value.find(e => e.id === elementoSelezionatoId.value)
  if (!el) return null

  if (el.type === 'rect' || el.type === 'diamond' || el.type === 'sticky' || el.type === 'arch') {
    return { x: el.x - 6, y: el.y - 6, w: el.w + 12, h: el.h + 12 }
  } else if (el.type === 'circle') {
    return { x: el.cx - el.rx - 6, y: el.cy - el.ry - 6, w: el.rx * 2 + 12, h: el.ry * 2 + 12 }
  } else if (el.type === 'arrow') {
    const minX = Math.min(el.x1, el.x2) - 8
    const minY = Math.min(el.y1, el.y2) - 8
    const w = Math.abs(el.x2 - el.x1) + 16
    const h = Math.abs(el.y2 - el.y1) + 16
    return { x: minX, y: minY, w: Math.max(w, 20), h: Math.max(h, 20) }
  } else if (el.type === 'pen' && el.points && el.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of el.points) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
    return { x: minX - 6, y: minY - 6, w: (maxX - minX) + 12, h: (maxY - minY) + 12 }
  }
  return null
})

// Esportazione SVG e PNG
function esportaSVG() {
  if (!svgRef.value) return
  const svgEl = svgRef.value.cloneNode(true)
  // Rimuovi elementi di UI interattiva (cursori remoti, selezioni)
  const layerUI = svgEl.querySelector('.layer-ui')
  if (layerUI) layerUI.remove()

  const svgData = new XMLSerializer().serializeToString(svgEl)
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ep-board-${roomId.value}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

function esportaPNG() {
  if (!svgRef.value) return
  const svgEl = svgRef.value.cloneNode(true)
  const layerUI = svgEl.querySelector('.layer-ui')
  if (layerUI) layerUI.remove()

  const svgData = new XMLSerializer().serializeToString(svgEl)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = new Image()

  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  img.onload = () => {
    canvas.width = svgRef.value.clientWidth * 2 // 2x per alta risoluzione retina
    canvas.height = svgRef.value.clientHeight * 2
    ctx.scale(2, 2)
    ctx.fillStyle = tema.value === 'dark' ? '#121316' : '#fbfaf8'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, svgRef.value.clientWidth, svgRef.value.clientHeight)

    const pngUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = pngUrl
    a.download = `ep-board-${roomId.value}.png`
    a.click()
    URL.revokeObjectURL(url)
  }
  img.src = url
}

// Copia Link Invito
function copiaLinkStanza() {
  const url = window.location.href
  navigator.clipboard.writeText(url).then(() => {
    linkCopiato.value = true
    setTimeout(() => {
      linkCopiato.value = false
    }, 2200)
  })
}

// Scorciatoie da tastiera
function gestisciKeyDown(e) {
  // Ignora tasti se stiamo digitando dentro un input/textarea
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

  if (e.code === 'Space' && !spacePremuto.value) {
    spacePremuto.value = true
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    eliminaSelezionato()
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    if (e.shiftKey) redo()
    else undo()
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    redo()
  } else if (e.key.toLowerCase() === 'v') {
    strumentoAttivo.value = 'select'
  } else if (e.key.toLowerCase() === 'h') {
    strumentoAttivo.value = 'pan'
  } else if (e.key.toLowerCase() === 'p') {
    strumentoAttivo.value = 'pen'
  } else if (e.key.toLowerCase() === 'r') {
    strumentoAttivo.value = 'rect'
  } else if (e.key.toLowerCase() === 'c') {
    strumentoAttivo.value = 'circle'
  } else if (e.key.toLowerCase() === 'd') {
    strumentoAttivo.value = 'diamond'
  } else if (e.key.toLowerCase() === 'a') {
    strumentoAttivo.value = 'arrow'
  } else if (e.key.toLowerCase() === 't') {
    strumentoAttivo.value = 'text'
  } else if (e.key.toLowerCase() === 's') {
    strumentoAttivo.value = 'sticky'
  }
}

function gestisciKeyUp(e) {
  if (e.code === 'Space') {
    spacePremuto.value = false
  }
}

onMounted(() => {
  connettiWebSocket()
  window.addEventListener('keydown', gestisciKeyDown)
  window.addEventListener('keyup', gestisciKeyUp)
})

onUnmounted(() => {
  if (ws.value) ws.value.close()
  window.removeEventListener('keydown', gestisciKeyDown)
  window.removeEventListener('keyup', gestisciKeyUp)
})
</script>

<template>
  <div class="schermata-board" :class="{ 'modalita-spazio': spacePremuto || strumentoAttivo === 'pan' }">
    <!-- Top Bar Integrata della Lavagna -->
    <header class="topbar-board">
      <div class="topbar-sinistra">
        <button type="button" class="btn-torna-home" title="Torna alla Home" @click="router.push('/')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div class="logo-board-badge">
          <span class="logo-ico">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </span>
          <span class="logo-testo">ep-board</span>
        </div>

        <div class="titolo-stanza-wrapper">
          <span class="badge-codice-stanza">{{ roomId }}</span>
        </div>
      </div>

      <!-- Dock Strumenti Centrale Flottante -->
      <div class="dock-strumenti">
        <button
          type="button"
          class="btn-tool"
          :class="{ attivo: strumentoAttivo === 'select' }"
          title="Seleziona e Sposta (V)"
          @click="strumentoAttivo = 'select'"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M3 3l7 18 3-7 7-3L3 3z"></path>
          </svg>
        </button>

        <button
          type="button"
          class="btn-tool"
          :class="{ attivo: strumentoAttivo === 'pan' }"
          title="Mano Pan (H o Spazio+Drag)"
          @click="strumentoAttivo = 'pan'"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path>
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path>
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path>
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path>
          </svg>
        </button>

        <div class="divisore-dock"></div>

        <button
          type="button"
          class="btn-tool"
          :class="{ attivo: strumentoAttivo === 'pen' }"
          title="Penna a mano libera (P)"
          @click="strumentoAttivo = 'pen'"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
          </svg>
        </button>

        <button
          type="button"
          class="btn-tool"
          :class="{ attivo: strumentoAttivo === 'rect' }"
          title="Rettangolo (R)"
          @click="strumentoAttivo = 'rect'"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          </svg>
        </button>

        <button
          type="button"
          class="btn-tool"
          :class="{ attivo: strumentoAttivo === 'circle' }"
          title="Cerchio / Ellisse (C)"
          @click="strumentoAttivo = 'circle'"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="12" cy="12" r="9"></circle>
          </svg>
        </button>

        <button
          type="button"
          class="btn-tool"
          :class="{ attivo: strumentoAttivo === 'diamond' }"
          title="Rombo di Decisione (D)"
          @click="strumentoAttivo = 'diamond'"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polygon points="12 2 22 12 12 22 2 12"></polygon>
          </svg>
        </button>

        <button
          type="button"
          class="btn-tool"
          :class="{ attivo: strumentoAttivo === 'arrow' }"
          title="Freccia di Collegamento (A)"
          @click="strumentoAttivo = 'arrow'"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>

        <button
          type="button"
          class="btn-tool"
          :class="{ attivo: strumentoAttivo === 'text' }"
          title="Testo (T)"
          @click="strumentoAttivo = 'text'"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="4 7 4 4 20 4 20 7"></polyline>
            <line x1="9" y1="20" x2="15" y2="20"></line>
            <line x1="12" y1="4" x2="12" y2="20"></line>
          </svg>
        </button>

        <button
          type="button"
          class="btn-tool"
          :class="{ attivo: strumentoAttivo === 'sticky' }"
          title="Nota Adesiva / Post-it (S)"
          @click="strumentoAttivo = 'sticky'"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"></path>
            <path d="M15 3v6h6"></path>
          </svg>
        </button>

        <div class="divisore-dock"></div>

        <!-- Menu Blocchi Architettura -->
        <div class="menu-arch-relativo">
          <button
            type="button"
            class="btn-tool btn-arch-trigger"
            :class="{ attivo: strumentoAttivo === 'arch' }"
            title="Componenti di Architettura Software"
            @click="menuArchAperto = !menuArchAperto; strumentoAttivo = 'arch'"
          >
            <span>{{ tipiArch[archTipoAttivo].icona }}</span>
            <span class="nome-arch-compatto">Arch</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div v-if="menuArchAperto" class="dropdown-arch">
            <div class="dropdown-header">Seleziona Blocco Architettura</div>
            <div class="griglia-arch-opzioni">
              <button
                v-for="(val, key) in tipiArch"
                :key="key"
                type="button"
                class="opzione-arch"
                :class="{ selezionato: archTipoAttivo === key }"
                @click="archTipoAttivo = key; menuArchAperto = false; strumentoAttivo = 'arch'"
              >
                <span class="arch-ico">{{ val.icona }}</span>
                <div class="arch-testi">
                  <strong>{{ val.nome }}</strong>
                  <small>{{ val.sub }}</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Bar Destra: Cursori, Partecipanti, Esporta, Tema -->
      <div class="topbar-destra">
        <!-- Badge Partecipanti Online -->
        <div class="pillola-presenza" :title="`${peers.size + 1} utenti connessi a questa stanza`">
          <span class="dot-live" :class="{ connesso: wsConnesso }"></span>
          <span class="testo-presenza">{{ peers.size + 1 }} online</span>
        </div>

        <!-- Copia Link Invito -->
        <button
          type="button"
          class="btn-topbar-azione"
          :class="{ copiato: linkCopiato }"
          title="Condividi link della lavagna"
          @click="copiaLinkStanza"
        >
          <svg v-if="!linkCopiato" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span class="etichetta-btn">{{ linkCopiato ? 'Copiato!' : 'Invita' }}</span>
        </button>

        <!-- Undo & Redo -->
        <div class="gruppo-undo-redo">
          <button type="button" class="btn-icona-top" :disabled="!storicoUndo.length" title="Annulla (Ctrl+Z)" @click="undo">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M3 7v6h6"></path>
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
            </svg>
          </button>
          <button type="button" class="btn-icona-top" :disabled="!storicoRedo.length" title="Ripristina (Ctrl+Y)" @click="redo">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21 7v6h-6"></path>
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
            </svg>
          </button>
        </div>

        <!-- Esporta -->
        <div class="dropdown-esporta-wrapper">
          <button type="button" class="btn-topbar-azione" title="Esporta lavagna">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span class="etichetta-btn">Esporta</span>
          </button>
          <div class="menu-esporta">
            <button type="button" @click="esportaPNG">Immagine PNG (Hi-Res)</button>
            <button type="button" @click="esportaSVG">Vettoriale SVG</button>
          </div>
        </div>

        <!-- Toggle Tema -->
        <button
          type="button"
          class="btn-icona-top"
          :title="tema === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'"
          @click="toggleTema"
        >
          <svg v-if="tema === 'dark'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2M12 20v2m4.93-15.07 1.41 1.41m-15.41 15.41 1.41 1.41M2 12h2m16 0h2m-4.93 4.93 1.41 1.41m-15.41-15.41 1.41 1.41"></path>
          </svg>
          <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
          </svg>
        </button>
      </div>
    </header>

    <!-- Toolbar Proprietà Flottante a Sinistra (Palette Colori & Spessore) -->
    <aside class="pannello-proprieta">
      <div class="sezione-prop">
        <span class="label-prop">Colore</span>
        <div class="griglia-colori">
          <button
            v-for="col in paletteColori"
            :key="col"
            type="button"
            class="campione-colore"
            :style="{ backgroundColor: col }"
            :class="{ attivo: coloreTratto === col }"
            @click="coloreTratto = col"
          ></button>
        </div>
      </div>

      <div class="sezione-prop">
        <span class="label-prop">Spessore</span>
        <div class="gruppo-spessore">
          <button
            type="button"
            class="btn-spessore"
            :class="{ attivo: spessoreTratto === 1.5 }"
            @click="spessoreTratto = 1.5"
          >
            <span class="linea-s" style="height: 1.5px;"></span>
          </button>
          <button
            type="button"
            class="btn-spessore"
            :class="{ attivo: spessoreTratto === 2.5 }"
            @click="spessoreTratto = 2.5"
          >
            <span class="linea-s" style="height: 2.5px;"></span>
          </button>
          <button
            type="button"
            class="btn-spessore"
            :class="{ attivo: spessoreTratto === 4 }"
            @click="spessoreTratto = 4"
          >
            <span class="linea-s" style="height: 4px;"></span>
          </button>
        </div>
      </div>

      <div class="divisore-prop"></div>

      <button type="button" class="btn-elimina-board" title="Elimina elemento selezionato" :disabled="!elementoSelezionatoId" @click="eliminaSelezionato">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>

      <button type="button" class="btn-pulisci-tutto" title="Svuota intera lavagna" @click="pulisciLavagna">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M3 3l18 18"></path>
          <path d="M18.7 8.3L15.7 5.3a2 2 0 0 0-2.83 0L3.5 14.7a2 2 0 0 0 0 2.83l2.97 2.97a2 2 0 0 0 2.83 0L18.7 11.13a2 2 0 0 0 0-2.83z"></path>
        </svg>
      </button>
    </aside>

    <!-- Canvas SVG Infinito Principale -->
    <div class="area-canvas-wrapper" @wheel="onWheel">
      <svg
        ref="svgRef"
        class="canvas-svg"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerUp"
      >
        <defs>
          <!-- Pattern a Griglia a Punti Infinita -->
          <pattern
            id="dot-grid"
            :x="pan.x"
            :y="pan.y"
            :width="28 * zoom"
            :height="28 * zoom"
            patternUnits="userSpaceOnUse"
          >
            <circle :cx="2 * zoom" :cy="2 * zoom" :r="1.2 * Math.min(zoom, 1.4)" fill="var(--griglia-dot)" />
          </pattern>

          <!-- Marker Freccia SVG -->
          <marker
            id="arrow-head"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor" />
          </marker>
        </defs>

        <!-- Sfondo con Griglia -->
        <rect width="100%" height="100%" fill="url(#dot-grid)" class="canvas-background" />

        <!-- Gruppo Trasformato (Pan & Zoom) -->
        <g :transform="`translate(${pan.x}, ${pan.y}) scale(${zoom})`">
          <!-- Elementi Esistenti -->
          <g v-for="el in elementi" :key="el.id" class="nodo-elemento" @pointerdown="selezionaElemento($event, el)">
            <!-- Rettangolo -->
            <rect
              v-if="el.type === 'rect'"
              :x="el.x"
              :y="el.y"
              :width="el.w"
              :height="el.h"
              rx="6"
              :stroke="el.stroke"
              :stroke-width="el.strokeWidth"
              :fill="el.fillType === 'solid' ? el.stroke : (el.fillType === 'subtle' ? 'var(--accento-sfondo)' : 'transparent')"
            />

            <!-- Cerchio -->
            <ellipse
              v-else-if="el.type === 'circle'"
              :cx="el.cx"
              :cy="el.cy"
              :rx="el.rx"
              :ry="el.ry"
              :stroke="el.stroke"
              :stroke-width="el.strokeWidth"
              :fill="el.fillType === 'solid' ? el.stroke : (el.fillType === 'subtle' ? 'var(--accento-sfondo)' : 'transparent')"
            />

            <!-- Rombo di Decisione -->
            <polygon
              v-else-if="el.type === 'diamond'"
              :points="calcolaPuntiRombo(el.x, el.y, el.w, el.h)"
              :stroke="el.stroke"
              :stroke-width="el.strokeWidth"
              :fill="el.fillType === 'solid' ? el.stroke : (el.fillType === 'subtle' ? 'var(--accento-sfondo)' : 'transparent')"
            />

            <!-- Freccia Connettiva -->
            <g v-else-if="el.type === 'arrow'">
              <line
                :x1="el.x1"
                :y1="el.y1"
                :x2="el.x2"
                :y2="el.y2"
                :stroke="el.stroke"
                :stroke-width="el.strokeWidth"
                stroke-linecap="round"
                marker-end="url(#arrow-head)"
                :style="{ color: el.stroke }"
              />
            </g>

            <!-- Penna Libera -->
            <path
              v-else-if="el.type === 'pen'"
              :d="generaPathPenna(el.points)"
              :stroke="el.stroke"
              :stroke-width="el.strokeWidth"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <!-- Testo Standalone -->
            <text
              v-else-if="el.type === 'text'"
              :x="el.x"
              :y="el.y"
              :fill="el.stroke"
              :font-size="el.fontSize || 16"
              font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              font-weight="600"
              dominant-baseline="hanging"
              @dblclick="apriModificaTesto(el)"
            >
              {{ el.text }}
            </text>

            <!-- Nota Adesiva (Sticky Note) -->
            <g v-else-if="el.type === 'sticky'" @dblclick="apriModificaTesto(el)">
              <rect
                :x="el.x"
                :y="el.y"
                :width="el.w"
                :height="el.h"
                rx="6"
                :fill="el.bg"
                filter="drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))"
              />
              <foreignObject :x="el.x + 12" :y="el.y + 12" :width="el.w - 24" :height="el.h - 24">
                <div xmlns="http://www.w3.org/1999/xhtml" class="testo-postit" :style="{ color: el.textColor }">
                  {{ el.text }}
                </div>
              </foreignObject>
            </g>

            <!-- Blocco Architettura Software (Scheda con Icona, Titolo, Ruolo e Badge) -->
            <g v-else-if="el.type === 'arch'" @dblclick="apriModificaTesto(el)">
              <!-- Scheda del blocco -->
              <rect
                :x="el.x"
                :y="el.y"
                :width="el.w"
                :height="el.h"
                rx="10"
                fill="var(--bg-superficie)"
                :stroke="el.borderColor"
                stroke-width="2"
                filter="drop-shadow(0 6px 18px rgba(0, 0, 0, 0.25))"
              />
              <!-- Barra Superiore colorata -->
              <rect
                :x="el.x"
                :y="el.y"
                :width="el.w"
                height="6"
                rx="3"
                :fill="el.color"
              />
              <!-- Contenuto foreignObject -->
              <foreignObject :x="el.x + 10" :y="el.y + 12" :width="el.w - 20" :height="el.h - 20">
                <div xmlns="http://www.w3.org/1999/xhtml" class="blocco-arch-html">
                  <div class="testata-arch">
                    <span class="arch-emoji">{{ el.icon }}</span>
                    <span class="dot-online"></span>
                  </div>
                  <strong class="titolo-arch">{{ el.title }}</strong>
                  <span class="sub-arch">{{ el.subtitle }}</span>
                </div>
              </foreignObject>
            </g>
          </g>

          <!-- Elemento in Creazione (Anteprima in tempo reale) -->
          <g v-if="elementoInCreazione" class="elemento-anteprima">
            <rect
              v-if="elementoInCreazione.type === 'rect'"
              :x="elementoInCreazione.x"
              :y="elementoInCreazione.y"
              :width="elementoInCreazione.w"
              :height="elementoInCreazione.h"
              rx="6"
              :stroke="elementoInCreazione.stroke"
              :stroke-width="elementoInCreazione.strokeWidth"
              fill="var(--accento-sfondo)"
            />
            <ellipse
              v-else-if="elementoInCreazione.type === 'circle'"
              :cx="elementoInCreazione.cx"
              :cy="elementoInCreazione.cy"
              :rx="elementoInCreazione.rx"
              :ry="elementoInCreazione.ry"
              :stroke="elementoInCreazione.stroke"
              :stroke-width="elementoInCreazione.strokeWidth"
              fill="var(--accento-sfondo)"
            />
            <polygon
              v-else-if="elementoInCreazione.type === 'diamond'"
              :points="calcolaPuntiRombo(elementoInCreazione.x, elementoInCreazione.y, elementoInCreazione.w, elementoInCreazione.h)"
              :stroke="elementoInCreazione.stroke"
              :stroke-width="elementoInCreazione.strokeWidth"
              fill="var(--accento-sfondo)"
            />
            <line
              v-else-if="elementoInCreazione.type === 'arrow'"
              :x1="elementoInCreazione.x1"
              :y1="elementoInCreazione.y1"
              :x2="elementoInCreazione.x2"
              :y2="elementoInCreazione.y2"
              :stroke="elementoInCreazione.stroke"
              :stroke-width="elementoInCreazione.strokeWidth"
              stroke-linecap="round"
              marker-end="url(#arrow-head)"
              :style="{ color: elementoInCreazione.stroke }"
            />
            <path
              v-else-if="elementoInCreazione.type === 'pen'"
              :d="generaPathPenna(elementoInCreazione.points)"
              :stroke="elementoInCreazione.stroke"
              :stroke-width="elementoInCreazione.strokeWidth"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </g>

          <!-- Bounding Box Selezione -->
          <g v-if="bboxSelezionato" class="layer-selezione">
            <rect
              :x="bboxSelezionato.x"
              :y="bboxSelezionato.y"
              :width="bboxSelezionato.w"
              :height="bboxSelezionato.h"
              fill="none"
              stroke="var(--accento)"
              stroke-width="1.5"
              stroke-dasharray="4 3"
              rx="4"
            />
            <!-- Maniglie agli angoli -->
            <circle :cx="bboxSelezionato.x" :cy="bboxSelezionato.y" r="4" fill="var(--accento)" />
            <circle :cx="bboxSelezionato.x + bboxSelezionato.w" :cy="bboxSelezionato.y" r="4" fill="var(--accento)" />
            <circle :cx="bboxSelezionato.x" :cy="bboxSelezionato.y + bboxSelezionato.h" r="4" fill="var(--accento)" />
            <circle :cx="bboxSelezionato.x + bboxSelezionato.w" :cy="bboxSelezionato.y + bboxSelezionato.h" r="4" fill="var(--accento)" />
          </g>

          <!-- Cursori Multiplayer dei Peer Connessi -->
          <g class="layer-ui">
            <g
              v-for="[peerId, peer] in peers.entries()"
              :key="peerId"
              v-show="peer.cursor"
              :transform="`translate(${peer.cursor?.x || 0}, ${peer.cursor?.y || 0})`"
              class="cursore-multiplayer"
            >
              <!-- Freccia Cursore SVG con colore del partecipante -->
              <path
                d="M 0 0 L 14 14 L 8 15 L 6 20 Z"
                :fill="peer.color"
                stroke="#ffffff"
                stroke-width="1.2"
                stroke-linejoin="round"
              />
              <!-- Badge Nome Partecipante -->
              <g transform="translate(14, 16)">
                <rect
                  x="0"
                  y="-12"
                  :width="peer.name.length * 7 + 14"
                  height="20"
                  rx="5"
                  :fill="peer.color"
                />
                <text
                  x="6"
                  y="2"
                  fill="#ffffff"
                  font-size="11"
                  font-weight="700"
                  font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                >
                  {{ peer.name }}
                </text>
              </g>
            </g>
          </g>
        </g>
      </svg>

      <!-- Overlay Modifica Testo Inline -->
      <div v-if="testoInModifica" class="dialog-modifica-testo" @click.self="salvaTestoInModifica">
        <div class="box-modifica">
          <h4>Modifica Testo</h4>
          <textarea
            v-model="testoInModifica.text"
            rows="3"
            class="textarea-modifica"
            autofocus
            @keydown.enter.ctrl="salvaTestoInModifica"
          ></textarea>
          <div class="azioni-modifica">
            <button type="button" class="btn-salva-testo" @click="salvaTestoInModifica">Salva (Ctrl+Invio)</button>
          </div>
        </div>
      </div>

      <!-- Dock Zoom & Pan in Basso a Sinistra -->
      <div class="dock-zoom">
        <button type="button" class="btn-zoom" title="Riduci Zoom" @click="zoomOut">-</button>
        <button type="button" class="btn-zoom-label" title="Ripristina 100%" @click="resetVista">
          {{ Math.round(zoom * 100) }}%
        </button>
        <button type="button" class="btn-zoom" title="Aumenta Zoom" @click="zoomIn">+</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schermata-board {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--canvas-bg);
  overflow: hidden;
  user-select: none;
}

.schermata-board.modalita-spazio {
  cursor: grab !important;
}

.schermata-board.modalita-spazio:active {
  cursor: grabbing !important;
}

/* Top Bar della Lavagna */
.topbar-board {
  position: relative;
  z-index: 30;
  height: 3.85rem;
  background: var(--header-bg);
  border-bottom: 1px solid var(--bordo-sottile);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
}

.topbar-sinistra {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-torna-home {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 8px;
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  color: var(--testo-secondario);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-torna-home:hover {
  color: var(--accento);
  border-color: var(--accento-bordo);
}

.logo-board-badge {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.logo-ico {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--accento), #ea580c);
  color: #fff;
}

.logo-testo {
  font-weight: 750;
  font-size: 0.98rem;
  color: var(--testo-primario);
  letter-spacing: -0.015em;
}

.badge-codice-stanza {
  font-family: ui-monospace, monospace;
  font-size: 0.76rem;
  font-weight: 700;
  padding: 0.22rem 0.55rem;
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-medio);
  border-radius: 6px;
  color: var(--testo-secondario);
}

/* Dock Strumenti Centrale */
.dock-strumenti {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  padding: 0.25rem 0.4rem;
  border-radius: 12px;
  box-shadow: var(--ombra-scheda);
}

.btn-tool {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--testo-secondario);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-tool:hover {
  background: var(--bg-superficie-elevata);
  color: var(--testo-primario);
}

.btn-tool.attivo {
  background: var(--accento-sfondo);
  color: var(--accento);
  box-shadow: inset 0 0 0 1px var(--accento-bordo);
}

.divisore-dock {
  width: 1px;
  height: 1.4rem;
  background-color: var(--bordo-medio);
  margin: 0 0.25rem;
}

/* Menu Dropdown Architettura */
.menu-arch-relativo {
  position: relative;
}

.btn-arch-trigger {
  width: auto;
  padding: 0 0.6rem;
  gap: 0.35rem;
  font-weight: 650;
  font-size: 0.8rem;
}

.dropdown-arch {
  position: absolute;
  top: 115%;
  left: 50%;
  transform: translateX(-50%);
  width: 260px;
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  border-radius: 12px;
  padding: 0.65rem;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
  z-index: 50;
}

.dropdown-header {
  font-size: 0.72rem;
  font-weight: 750;
  text-transform: uppercase;
  color: var(--testo-terziario);
  letter-spacing: 0.04em;
  margin-bottom: 0.45rem;
  padding: 0 0.3rem;
}

.griglia-arch-opzioni {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.opzione-arch {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.55rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.opzione-arch:hover {
  background: var(--bg-superficie-elevata);
  border-color: var(--bordo-sottile);
}

.opzione-arch.selezionato {
  background: var(--accento-sfondo);
  border-color: var(--accento-bordo);
}

.arch-ico {
  font-size: 1.15rem;
}

.arch-testi strong {
  display: block;
  font-size: 0.82rem;
  color: var(--testo-primario);
}

.arch-testi small {
  font-size: 0.72rem;
  color: var(--testo-terziario);
}

/* Top Bar Destra */
.topbar-destra {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.pillola-presenza {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.28rem 0.65rem;
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  border-radius: 9999px;
  font-size: 0.78rem;
  font-weight: 650;
  color: var(--testo-secondario);
}

.dot-live {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #ef4444;
}

.dot-live.connesso {
  background-color: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}

.btn-topbar-azione {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 2.1rem;
  padding: 0 0.7rem;
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  border-radius: 8px;
  color: var(--testo-primario);
  font-size: 0.8rem;
  font-weight: 650;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-topbar-azione:hover {
  background: var(--bg-superficie-elevata);
  border-color: var(--accento-bordo);
  color: var(--accento);
}

.btn-topbar-azione.copiato {
  background: var(--accento-sfondo);
  border-color: var(--accento);
  color: var(--accento);
}

.gruppo-undo-redo {
  display: flex;
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  border-radius: 8px;
}

.btn-icona-top {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  background: transparent;
  border: none;
  color: var(--testo-secondario);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-icona-top:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-icona-top:not(:disabled):hover {
  color: var(--accento);
}

/* Dropdown Esporta */
.dropdown-esporta-wrapper {
  position: relative;
}

.dropdown-esporta-wrapper:hover .menu-esporta {
  display: flex;
}

.menu-esporta {
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  width: 170px;
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  border-radius: 10px;
  padding: 0.35rem;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
  z-index: 40;
  flex-direction: column;
  gap: 0.2rem;
}

.menu-esporta button {
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 0.7rem;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--testo-primario);
  cursor: pointer;
  transition: all 0.15s ease;
}

.menu-esporta button:hover {
  background: var(--accento-sfondo);
  color: var(--accento);
}

/* Floating Proprietà Toolbar a Sinistra */
.pannello-proprieta {
  position: absolute;
  top: 5rem;
  left: 1rem;
  z-index: 25;
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  border-radius: 12px;
  padding: 0.75rem;
  box-shadow: var(--ombra-scheda);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 140px;
}

.label-prop {
  font-size: 0.7rem;
  font-weight: 750;
  text-transform: uppercase;
  color: var(--testo-terziario);
  letter-spacing: 0.04em;
  margin-bottom: 0.35rem;
  display: block;
}

.griglia-colori {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
}

.campione-colore {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.campione-colore:hover {
  transform: scale(1.15);
}

.campione-colore.attivo {
  border-color: #ffffff;
  box-shadow: 0 0 0 2px var(--accento);
}

.gruppo-spessore {
  display: flex;
  gap: 0.25rem;
}

.btn-spessore {
  flex: 1;
  height: 24px;
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-sottile);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-spessore.attivo {
  border-color: var(--accento);
  background: var(--accento-sfondo);
}

.linea-s {
  width: 16px;
  background-color: var(--testo-primario);
  border-radius: 9999px;
}

.divisore-prop {
  height: 1px;
  background-color: var(--bordo-medio);
}

.btn-elimina-board, .btn-pulisci-tutto {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  border-radius: 8px;
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-sottile);
  color: var(--testo-secondario);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-elimina-board:not(:disabled):hover {
  color: #ef4444;
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.btn-elimina-board:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-pulisci-tutto:hover {
  color: #f97316;
  border-color: #f97316;
}

/* Canvas Area */
.area-canvas-wrapper {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.canvas-svg {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

.nodo-elemento {
  cursor: pointer;
}

.testo-postit {
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
  white-space: pre-wrap;
  user-select: none;
}

/* Blocco Architettura */
.blocco-arch-html {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.testata-arch {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.arch-emoji {
  font-size: 1.25rem;
}

.dot-online {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.titolo-arch {
  font-size: 0.88rem;
  font-weight: 750;
  color: var(--testo-primario);
  letter-spacing: -0.01em;
}

.sub-arch {
  font-size: 0.72rem;
  color: var(--testo-terziario);
  font-weight: 550;
}

/* Dialog Modifica Testo */
.dialog-modifica-testo {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
}

.box-modifica {
  width: 360px;
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  border-radius: 14px;
  padding: 1.25rem;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5);
}

.box-modifica h4 {
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  color: var(--testo-primario);
}

.textarea-modifica {
  width: 100%;
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-medio);
  border-radius: 8px;
  padding: 0.65rem;
  color: var(--testo-primario);
  font-family: inherit;
  font-size: 0.92rem;
  resize: vertical;
  outline: none;
}

.textarea-modifica:focus {
  border-color: var(--accento);
}

.azioni-modifica {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.btn-salva-testo {
  background: var(--accento);
  color: #fff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

/* Dock Zoom in basso a sinistra */
.dock-zoom {
  position: absolute;
  bottom: 1.25rem;
  left: 1.25rem;
  z-index: 25;
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  border-radius: 10px;
  display: flex;
  align-items: center;
  padding: 0.2rem;
  box-shadow: var(--ombra-scheda);
}

.btn-zoom {
  width: 2rem;
  height: 2rem;
  background: transparent;
  border: none;
  color: var(--testo-primario);
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-zoom:hover {
  background: var(--bg-superficie-elevata);
}

.btn-zoom-label {
  background: transparent;
  border: none;
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--testo-secondario);
  padding: 0 0.55rem;
  cursor: pointer;
}

.btn-zoom-label:hover {
  color: var(--accento);
}

/* Cursori Multiplayer */
.cursore-multiplayer {
  pointer-events: none;
  transition: transform 0.04s linear;
}

@media (max-width: 820px) {
  .pannello-proprieta {
    display: none;
  }
  .nome-arch-compatto {
    display: none;
  }
}
</style>
