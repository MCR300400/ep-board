<script setup>
import { ref, onMounted } from 'vue'
import { useLingua } from '../composables/useLingua'

const { isItalian, t } = useLingua()
const API = import.meta.env.VITE_API_URL
const unici = ref(null)
const caricamento = ref(true)

async function caricaContatore() {
  if (!API) {
    caricamento.value = false
    return
  }
  try {
    const res = await fetch(`${API}/pubblico/contatore?sito=board`)
    if (res.ok) {
      const data = await res.json()
      unici.value = data.unici ?? data.visite
    }
  } catch (err) {
    console.debug('Contatore non disponibile:', err)
  } finally {
    caricamento.value = false
  }
}

onMounted(() => {
  caricaContatore()
})
</script>

<template>
  <div v-if="unici !== null" class="badge-contatore" :title="t('contatore.tooltip')">
    <span class="pulsante-dot"></span>
    <span class="testo">
      {{ unici.toLocaleString(isItalian ? 'it-IT' : 'en-US') }} {{ unici === 1 ? t('contatore.singolare') : t('contatore.plurale') }}
    </span>
  </div>
</template>

<style scoped>
.badge-contatore {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: var(--accento-sfondo);
  border: 1px solid var(--accento-bordo);
  color: var(--accento-testo);
  padding: 0.28rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 550;
  letter-spacing: 0.01em;
  transition: all 0.2s ease;
}

.pulsante-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }
  70% {
    box-shadow: 0 0 0 5px rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}
</style>
