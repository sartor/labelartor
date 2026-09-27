import { createRouter, createWebHistory } from 'vue-router'

import EditorView from '@/views/EditorView.vue'

// Clean URLs. A static host needs a fallback to index.html only once there
// are routes other than "/".
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'editor', component: EditorView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
