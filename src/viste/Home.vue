<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Contatore from '../components/Contatore.vue'

const router = useRouter()
const idLavagnaInput = ref('')
const erroreInput = ref('')
const staCreando = ref(false)
const staVerificando = ref(false)

const WS_BASE = import.meta.env.VITE_WS_URL || 'wss://ep-ws.edoardopippi00.workers.dev'
const API_BASE = WS_BASE.replace(/^ws(s)?:/, 'http$1:')

function generaIdLavagna() {
  const prefissi = ['arch', 'sys', 'cloud', 'flow', 'db', 'api', 'core', 'mesh']
  const p = prefissi[Math.floor(Math.random() * prefissi.length)]
  const num = Math.floor(Math.random() * 899) + 100
  return `${p}-${num}`
}

async function creaNuovaLavagna() {
  if (staCreando.value) return
  staCreando.value = true
  const id = generaIdLavagna()
  try {
    await fetch(`${API_BASE}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: 'board', room: id })
    })
  } catch (err) {
    console.error('Errore creazione lavagna:', err)
  } finally {
    staCreando.value = false
    router.push(`/board/${id}`)
  }
}

async function entraInLavagna() {
  const pulito = idLavagnaInput.value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
  if (!pulito || pulito.length < 2) {
    erroreInput.value = 'Inserisci un nome o ID valido per la lavagna'
    return
  }
  erroreInput.value = ''
  staVerificando.value = true

  try {
    const res = await fetch(`${API_BASE}/api/rooms/check?app=board&room=${encodeURIComponent(pulito)}`)
    if (!res.ok) {
      erroreInput.value = 'Impossibile verificare la lavagna. Riprova.'
      return
    }
    const data = await res.json()
    if (!data.exists) {
      erroreInput.value = 'Lavagna non trovata. Verifica l\'ID o crea una nuova lavagna.'
      return
    }
    router.push(`/board/${pulito}`)
  } catch (err) {
    erroreInput.value = 'Errore di connessione al server.'
  } finally {
    staVerificando.value = false
  }
}
</script>

<template>
  <div class="pagina-home">
    <section class="sezione-hero">
      <!-- Badge e Contatore Visitatori Unici (SOLO nella pagina iniziale) -->
      <div class="testata-hero-badge">
        <div class="badge-tag">
          <span class="dot"></span>
          Multiplayer 60fps • Cloudflare WebSockets
        </div>
        <Contatore />
      </div>

      <h1 class="titolo-hero">
        Disegna architetture software e diagrammi in tempo reale.
      </h1>

      <p class="sottotitolo-hero">
        Una lavagna infinita collaborativa per progettare sistemi, tracciare flussi, collegare nodi infrastrutturali e fare brainstorming con cursori multiplayer a bassissima latenza.
      </p>

      <!-- Azioni Rapide Lavagna -->
      <div class="scheda-azione-board">
        <div class="blocco-crea">
          <button type="button" class="btn-primario" :disabled="staCreando" @click="creaNuovaLavagna">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            {{ staCreando ? 'Creazione in corso...' : 'Crea Nuova Lavagna Live' }}
          </button>
          <span class="nota-crea">Genera un'area di lavoro infinita condivisibile</span>
        </div>

        <div class="divisore-o">
          <span>oppure</span>
        </div>

        <form class="blocco-unisciti" @submit.prevent="entraInLavagna">
          <div class="input-gruppo">
            <input
              v-model="idLavagnaInput"
              type="text"
              placeholder="Nome stanza (es. arch-404)"
              maxlength="32"
              class="input-board"
              :disabled="staVerificando"
            />
            <button type="submit" class="btn-secondario" :disabled="staVerificando">
              {{ staVerificando ? 'Verifica...' : 'Apri' }}
            </button>
          </div>
          <span v-if="erroreInput" class="testo-errore">{{ erroreInput }}</span>
          <span v-else class="nota-crea">Entra in una lavagna già creata con il suo link o ID</span>
        </form>
      </div>
    </section>

    <!-- Pilastri / Funzionalità -->
    <section id="caratteristiche" class="sezione-pilastri">
      <h2 class="titolo-sezione">Funzionalità per Sviluppatori & Team</h2>
      <div class="griglia-pilastri">
        <div class="scheda-pilastro">
          <div class="icona-box">🖱️</div>
          <h3>Cursori Multiplayer 60 FPS</h3>
          <p>Visualizza i movimenti dei cursori di tutti i partecipanti in tempo reale con nome, colore personalizzato e interpolazione fluida senza scatti.</p>
        </div>

        <div class="scheda-pilastro">
          <div class="icona-box">🏗️</div>
          <h3>Blocchi Architettura Software</h3>
          <p>Componenti pronti all'uso: Server, Database, Cloudflare Workers, Queue, Cache e Client. Collegali con frecce connettive dinamiche.</p>
        </div>

        <div class="scheda-pilastro">
          <div class="icona-box">✏️</div>
          <h3>Forme Vettoriali & Penna Libera</h3>
          <p>Rettangoli, cerchi, rombi per decisioni logiche, note adesive (post-it) e disegno a mano libera con levigatura automatica del tratto.</p>
        </div>
      </div>
    </section>

    <!-- Showcase Architetture -->
    <section id="architetture" class="sezione-architetture">
      <div class="box-showcase">
        <div class="showcase-info">
          <h3>Esporta in SVG & PNG ad Alta Risoluzione</h3>
          <p>
            Al termine della sessione puoi esportare il diagramma con un solo click in formato vettoriale SVG o immagine PNG trasparente per documentazione GitHub, README o presentazioni tecniche.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pagina-home {
  padding: 2.5rem 0 4rem;
  max-width: 900px;
  margin: 0 auto;
}

.sezione-hero {
  padding: 2rem 0 3.5rem;
}

.testata-hero-badge {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
  margin-bottom: 1.4rem;
}

.badge-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.32rem 0.8rem;
  background: var(--accento-sfondo);
  color: var(--accento);
  border: 1px solid var(--accento-bordo);
  border-radius: 9999px;
  font-size: 0.82rem;
  font-weight: 650;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--accento);
}

.titolo-hero {
  font-size: 2.6rem;
  font-weight: 850;
  line-height: 1.18;
  letter-spacing: -0.025em;
  color: var(--testo-primario);
  margin-bottom: 1.15rem;
}

.sottotitolo-hero {
  font-size: 1.1rem;
  line-height: 1.65;
  color: var(--testo-secondario);
  margin-bottom: 2.5rem;
  max-width: 740px;
}

/* Scheda Azione Board */
.scheda-azione-board {
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-medio);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: var(--ombra-scheda);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
}

.blocco-crea, .blocco-unisciti {
  flex: 1;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-primario {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: var(--accento);
  color: #ffffff;
  border: none;
  padding: 0.85rem 1.4rem;
  border-radius: 10px;
  font-size: 0.98rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: 0 4px 14px var(--accento-sfondo-forte);
}

.btn-primario:hover {
  background: var(--accento-hover);
  transform: translateY(-1px);
}

.nota-crea {
  font-size: 0.78rem;
  color: var(--testo-terziario);
}

.divisore-o {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--testo-terziario);
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
}

.input-gruppo {
  display: flex;
  gap: 0.5rem;
}

.input-board {
  flex: 1;
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-medio);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: var(--testo-primario);
  font-family: ui-monospace, monospace;
  font-size: 0.95rem;
  font-weight: 650;
  outline: none;
}

.input-board:focus {
  border-color: var(--accento-bordo);
  box-shadow: 0 0 0 2px var(--accento-sfondo);
}

.btn-secondario {
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-medio);
  color: var(--testo-primario);
  padding: 0 1.25rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondario:hover {
  border-color: var(--accento-bordo);
  color: var(--accento);
}

.testo-errore {
  font-size: 0.78rem;
  color: #ef4444;
  font-weight: 600;
}

/* Pilastri */
.sezione-pilastri {
  padding: 3rem 0;
  border-top: 1px solid var(--bordo-sottile);
}

.titolo-sezione {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--testo-primario);
  letter-spacing: -0.02em;
  margin-bottom: 1.75rem;
}

.griglia-pilastri {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.scheda-pilastro {
  background: var(--bg-superficie);
  border: 1px solid var(--bordo-sottile);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.scheda-pilastro:hover {
  border-color: var(--bordo-medio);
  transform: translateY(-2px);
}

.icona-box {
  font-size: 1.6rem;
  margin-bottom: 0.85rem;
}

.scheda-pilastro h3 {
  font-size: 1.1rem;
  font-weight: 750;
  color: var(--testo-primario);
  margin-bottom: 0.5rem;
}

.scheda-pilastro p {
  font-size: 0.92rem;
  color: var(--testo-secondario);
  line-height: 1.55;
}

.sezione-architetture {
  padding: 1.5rem 0 3rem;
}

.box-showcase {
  background: var(--bg-superficie-elevata);
  border: 1px solid var(--bordo-medio);
  border-radius: 14px;
  padding: 1.75rem;
}

.showcase-info h3 {
  font-size: 1.15rem;
  font-weight: 750;
  color: var(--testo-primario);
  margin-bottom: 0.5rem;
}

.showcase-info p {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--testo-secondario);
}

@media (max-width: 680px) {
  .titolo-hero {
    font-size: 2.1rem;
  }
  .scheda-azione-board {
    flex-direction: column;
    align-items: stretch;
  }
  .divisore-o {
    margin: 0.5rem 0;
  }
}
</style>
