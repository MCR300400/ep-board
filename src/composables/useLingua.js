import { ref, computed } from 'vue'

const LINGUA_KEY = 'ep_lingua'

function ottieniLinguaIniziale() {
  if (typeof window === 'undefined') return 'it'
  try {
    const salvata = localStorage.getItem(LINGUA_KEY)
    if (salvata === 'it' || salvata === 'en') return salvata
    const browserLang = navigator.language || navigator.userLanguage || ''
    if (browserLang.startsWith('it')) return 'it'
    return 'it'
  } catch (e) {
    console.debug('Impossibile accedere a localStorage per la lingua:', e)
    return 'it'
  }
}

const lingua = ref(ottieniLinguaIniziale())

export function useLingua() {
  const isItalian = computed(() => lingua.value === 'it')
  const isEnglish = computed(() => lingua.value === 'en')

  function applicaLingua(nuovaLingua) {
    lingua.value = nuovaLingua
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', nuovaLingua)
      try {
        localStorage.setItem(LINGUA_KEY, nuovaLingua)
      } catch (e) {
        console.warn('Impossibile salvare la lingua in localStorage:', e)
      }
    }
  }

  function toggleLingua() {
    applicaLingua(lingua.value === 'it' ? 'en' : 'it')
  }

  function t(valore) {
    if (!valore) return ''
    if (typeof valore === 'object') {
      return valore[lingua.value] || valore.it || ''
    }
    return dizionario[valore]?.[lingua.value] || valore
  }

  return {
    lingua,
    isItalian,
    isEnglish,
    setLingua: applicaLingua,
    toggleLingua,
    t
  }
}

export const dizionario = {
  // Navigazione
  'nav.home': { it: 'Home', en: 'Home' },
  'nav.funzionalita': { it: 'Funzionalità', en: 'Features' },
  'nav.architetture': { it: 'Blocchi Architettura', en: 'Architecture Blocks' },
  'nav.temaChiaro': { it: 'Chiaro', en: 'Light' },
  'nav.temaScuro': { it: 'Scuro', en: 'Dark' },
  'nav.menu': { it: 'Menu', en: 'Menu' },
  'nav.chiudi': { it: 'Chiudi', en: 'Close' },

  // Contatore
  'contatore.tooltip': {
    it: 'Visitatori unici totali tracciati nel rispetto della privacy',
    en: 'Total unique visitors tracked with privacy-first analytics'
  },
  'contatore.singolare': { it: 'visitatore unico', en: 'unique visitor' },
  'contatore.plurale': { it: 'visitatori unici', en: 'unique visitors' },

  // Home Hero
  'home.badge': { it: 'Multiplayer 60fps • Cloudflare WebSockets', en: 'Multiplayer 60fps • Cloudflare WebSockets' },
  'home.titolo': { it: 'Disegna architetture software e diagrammi in tempo reale.', en: 'Design software architectures and diagrams in real time.' },
  'home.sottotitolo': {
    it: 'Una lavagna infinita collaborativa per progettare sistemi, tracciare flussi, collegare nodi infrastrutturali e fare brainstorming con cursori multiplayer a bassissima latenza.',
    en: 'An infinite collaborative canvas to architect systems, trace logic flows, connect infrastructure nodes, and brainstorm with ultra-low latency multiplayer cursors.'
  },
  'home.crea': { it: 'Crea Nuova Lavagna Live', en: 'Create New Live Board' },
  'home.creando': { it: 'Creazione in corso...', en: 'Creating...' },
  'home.notaCrea': { it: 'Genera un\'area di lavoro infinita condivisibile', en: 'Generates a shareable infinite workspace' },
  'home.oppure': { it: 'oppure', en: 'or' },
  'home.placeholderInput': { it: 'Nome stanza (es. arch-404)', en: 'Room name (e.g. arch-404)' },
  'home.apri': { it: 'Apri', en: 'Open' },
  'home.verificando': { it: 'Verifica...', en: 'Checking...' },
  'home.notaApri': { it: 'Entra in una lavagna già creata con il suo link o ID', en: 'Join an existing whiteboard using its link or ID' },
  'home.errLunghezza': { it: 'Inserisci un nome o ID valido per la lavagna', en: 'Enter a valid board name or ID' },
  'home.errNonTrovata': { it: 'Lavagna non trovata. Verifica l\'ID o crea una nuova lavagna.', en: 'Board not found. Check the ID or create a new board.' },
  'home.errVerifica': { it: 'Impossibile verificare la lavagna. Riprova.', en: 'Unable to verify board. Please retry.' },
  'home.errConnessione': { it: 'Errore di connessione al server.', en: 'Connection error to server.' },

  // Home Features
  'home.sezFunzionalita': { it: 'Funzionalità per Sviluppatori & Team', en: 'Features for Developers & Teams' },
  'home.f1Titolo': { it: 'Cursori Multiplayer 60 FPS', en: '60 FPS Multiplayer Cursors' },
  'home.f1Desc': {
    it: 'Visualizza i movimenti dei cursori di tutti i partecipanti in tempo reale con nome, colore personalizzato e interpolazione fluida senza scatti.',
    en: 'View real-time participant cursors with custom usernames, distinct colors, and smooth 60 FPS interpolation.'
  },
  'home.f2Titolo': { it: 'Blocchi Architettura Software', en: 'Software Architecture Blocks' },
  'home.f2Desc': {
    it: 'Componenti pronti all\'uso: Server, Database, Cloudflare Workers, Queue, Cache e Client. Collegali con frecce connettive dinamiche.',
    en: 'Ready-to-use cloud components: Server, Database, Cloudflare Workers, Queue, Cache, and Client with dynamic connector arrows.'
  },
  'home.f3Titolo': { it: 'Sincronizzazione Stateful & Durable Objects', en: 'Stateful Sync & Durable Objects' },
  'home.f3Desc': {
    it: 'Nessun salvataggio manuale. Lo stato del canvas è persistito in un database SQLite distribuito all\'edge su Cloudflare Durable Objects.',
    en: 'Zero manual saves needed. Canvas state is reliably persisted to an edge-replicated SQLite database on Cloudflare Durable Objects.'
  },

  // Board UI
  'board.ritorno': { it: 'Torna alla Home', en: 'Back to Home' },
  'board.copiaLink': { it: 'Copia Link', en: 'Copy Link' },
  'board.linkCopiato': { it: 'Link Copiato!', en: 'Link Copied!' },
  'board.svuota': { it: 'Svuota', en: 'Clear' },
  'board.esporta': { it: 'Esporta', en: 'Export' },
  'board.esportaPNG': { it: 'Immagine PNG (Hi-Res)', en: 'PNG Image (Hi-Res)' },
  'board.esportaSVG': { it: 'Vettoriale SVG', en: 'Vector SVG' },
  'board.strumenti': { it: 'Strumenti', en: 'Tools' },
  'board.stile': { it: 'Stile', en: 'Style' },
  'board.opzioniStile': { it: 'Opzioni Stile', en: 'Style Options' },
  'board.colore': { it: 'Colore', en: 'Color' },
  'board.spessore': { it: 'Spessore', en: 'Thickness' },
  'board.online': { it: 'online', en: 'online' },
  'board.invita': { it: 'Invita', en: 'Invite' },
  'board.copiato': { it: 'Copiato!', en: 'Copied!' },
  'board.annulla': { it: 'Annulla', en: 'Undo' },
  'board.ripristina': { it: 'Ripristina', en: 'Redo' },
  'board.annullaBtn': { it: 'Annulla', en: 'Cancel' },
  'board.confermaSvuota': { it: 'Svuotare la lavagna?', en: 'Clear the board?' },
  'board.msgSvuota': {
    it: 'Questa operazione rimuoverà tutti gli elementi dalla lavagna per tutti gli utenti. Potrai ripristinarli con "Annulla" (Undo).',
    en: 'This will remove all elements from the whiteboard for all users. You can restore them with Undo.'
  },
  'board.siSvuotaTutto': { it: 'Sì, svuota tutto', en: 'Yes, clear all' },
  'board.titoloArch': { it: 'Componenti Architettura', en: 'Architecture Components' },
  'board.toccaUnBlocco': {
    it: 'Tocca un blocco e poi tocca la lavagna nel punto in cui vuoi inserirlo:',
    en: 'Tap a block and then tap canvas where you want to place it:'
  },
  'board.modificaComponente': { it: 'Modifica Componente', en: 'Edit Component' },
  'board.nomeTitolo': { it: 'Nome / Titolo', en: 'Name / Title' },
  'board.sottotitoloRuolo': { it: 'Sottotitolo / Ruolo', en: 'Subtitle / Role' },
  'board.salvaModifiche': { it: 'Salva Modifiche', en: 'Save Changes' },
  'board.menuLavagna': { it: 'Menu Lavagna', en: 'Board Menu' },
  'board.condividiLavagna': { it: 'Condividi Lavagna', en: 'Share Board' },
  'board.copiaPerCollaborare': { it: 'Copia il link per collaborare', en: 'Copy link to collaborate' },
  'board.esportaPNGDettaglio': { it: 'Risoluzione Retina ad alta qualità', en: 'High quality Retina resolution' },
  'board.esportaSVGDettaglio': { it: 'Compatibile con Figma, Illustrator e browser', en: 'Compatible with Figma, Illustrator and browser' },
  'board.svuotaIntera': { it: 'Svuota Intera Lavagna', en: 'Clear Entire Board' },
  'board.cancellaTutti': { it: 'Cancella tutti gli elementi per tutti gli utenti', en: 'Deletes all elements for all users' },
  'board.eliminaElemento': { it: 'Elimina elemento selezionato', en: 'Delete selected element' },
  'board.nonTrovata': { it: 'Lavagna non trovata', en: 'Board not found' },
  'board.descNonTrovata': {
    it: 'La lavagna specificata non esiste o non è mai stata creata.\nNon è consentito creare una lavagna inserendo un codice casuale nel campo di accesso.',
    en: 'The requested board does not exist or has never been created.\nCreating a board by typing a random room code in the join field is not permitted.'
  },
  'board.creaNuova': { it: 'Crea Nuova Lavagna', en: 'Create New Board' }
}
