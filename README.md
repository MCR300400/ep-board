# ep-board 📐

> Lavagna collaborativa infinita in tempo reale per progettare architetture software, diagrammi di sistema, flussi logici e note adesive con cursori multiplayer a 60 FPS, alimentata da **Cloudflare Workers & SQLite Durable Objects**.

[![Live App](https://img.shields.io/badge/Live%20App-ep--board.pages.dev-f97316?style=flat&logo=cloudflare)](https://ep-board.pages.dev)
[![GitHub](https://img.shields.io/badge/GitHub-MCR300400%2Fep--board-181717?style=flat&logo=github)](https://github.com/MCR300400/ep-board)
[![Backend WebSocket](https://img.shields.io/badge/Backend-Cloudflare%20Durable%20Objects-orange?style=flat&logo=cloudflare)](https://ep-ws.edoardopippi00.workers.dev)

---

## 🚀 Caratteristiche Principali

- 🖱️ **Cursori Multiplayer 60 FPS**: Movimento in tempo reale dei cursori dei collaboratori con nome e colore distintivo.
- 🏗️ **Blocchi di Architettura Software**: Componenti grafici pronti all'uso per Client, API Backend, Cloudflare Workers, Database D1, Cache KV e Code di Messaggi.
- ♾️ **Canvas Infinito**: Pan & Zoom fluidi (rotella mouse, pinch to zoom su touch screen, barra spaziatrice + drag) con griglia a punti reattiva.
- ✏️ **Strumenti Vettoriali Completi**:
  - Penna a mano libera con levigatura automatica del tratto SVG.
  - Forme geometriche (Rettangoli, Cerchi, Rombi di decisione logica).
  - Frecce connettive con puntatore orientabile.
  - Note adesive (Post-it) e caselle di testo con editing inline (doppio click).
- 🎨 **Design System Coerente**: Tema Grafite scuro (`#121316`) con accento arancione artigianale (`#f97316` / `#ea580c`), toggle rapido Chiaro / Scuro con prevenzione FOUC.
- 📤 **Esportazione ad Alta Risoluzione**: Esporta l'intero diagramma in formato vettoriale **SVG** o immagine **PNG** nitida per README e documentazione tecnica.
- 📊 **Contatore Visite Univoche**: Integrato con `ep-analytics` sulla pagina iniziale, rispettando la privacy senza cookie.

---

## 🛠️ Architettura & Stack Tecnologico

- **Frontend**: [Vue 3](https://vuejs.org/) + [Vite](https://vite.dev/) + [Vue Router](https://router.vuejs.org/)
- **Hosting**: [Cloudflare Pages](https://pages.cloudflare.com/) (Edge globale a latenza minima)
- **Coordinamento WebSocket**: `ep-ws` basato su **Cloudflare SQLite Durable Objects** (`RoomDO`), che garantisce isolamento delle stanze e broadcast ultra-veloce in RAM.
- **Metriche**: `ep-analytics` con SQLite Cloudflare D1.

---

## 💻 Sviluppo Locale

```bash
# Clona il repository
git clone https://github.com/MCR300400/ep-board.git
cd ep-board

# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev

# Compila per la produzione
npm run build
```

---

## 🌐 Deploy su Cloudflare Pages

```bash
# Compilazione asset statici
npm run build

# Deploy immediato
npx wrangler pages deploy dist --project-name=ep-board
```

---

## 👤 Autore

**Edoardo Pippi**
- Portfolio: [edoardopippi.dev](https://edoardopippi.dev)
- GitHub: [@MCR300400](https://github.com/MCR300400)
