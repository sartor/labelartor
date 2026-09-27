import { ref, watch, type Ref } from 'vue'

/** Prefix for every localStorage key the app owns (index.html reads one key with it too). */
const STORAGE_PREFIX = 'pt-labels:'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/** A ref mirrored to localStorage (JSON). Storage failures are ignored. */
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
