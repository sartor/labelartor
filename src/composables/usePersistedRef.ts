import { ref, watch, type Ref } from 'vue'

import { STORAGE_PREFIX } from '@/storage'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/**
 * A ref mirrored to localStorage (JSON) under the app's prefix. Storage
 * failures are ignored. The stored shapes are versioned in `@/storage`.
 */
export function usePersistedRef<T>(key: string, initial: T): Ref<T> {
  const state = ref(load(key, initial)) as Ref<T>
  watch(
    state,
    (value) => {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
      } catch {
        // Private mode or quota exceeded.
      }
    },
    { deep: true },
  )
  return state
}
