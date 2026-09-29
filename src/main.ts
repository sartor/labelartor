import 'halfmoon/css/halfmoon.min.css'
import './styles/fonts.css'
import './styles/app.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { loadLabelIcons } from './labelIconAssets'
import { migrateStorage } from './storage'
import { useUserIconsStore } from './stores/userIcons'

// Stored state is brought up to date before any store reads it. If that
// fails, the stores fall back to their defaults rather than the app not starting.
try {
  migrateStorage(localStorage)
} catch (error) {
  console.error('Could not migrate the stored state.', error)
}

const app = createApp(App)

app.use(createPinia())

// Icons are decoded before the first render, so they are never drawn blank.
useUserIconsStore()
loadLabelIcons()
  .catch((error) => console.error('Could not load the label icons.', error))
  .finally(() => app.mount('#app'))
