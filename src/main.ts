import 'halfmoon/css/halfmoon.min.css'
import './styles/fonts.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { migrateStorage } from './storage'

// Stored state is brought up to date before any store reads it. If that
// fails, the stores fall back to their defaults rather than the app not starting.
try {
  migrateStorage(localStorage)
} catch (error) {
  console.error('Could not migrate the stored state.', error)
}

const app = createApp(App)

app.use(createPinia())

app.mount('#app')
