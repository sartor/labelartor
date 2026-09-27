import { defineStore } from 'pinia'
import { computed } from 'vue'

import { usePersistedRef } from '@/composables/usePersistedRef'
import { createPrintedEntry, type LabelDocument, type PrintedEntry } from '@/core/label'

/** Every label that was printed, newest first. Kept until cleared. */
export const useHistoryStore = defineStore('history', () => {
  const items = usePersistedRef<PrintedEntry[]>('history.items', [])

  const count = computed(() => items.value.length)

  const find = (id: string) => items.value.find((item) => item.id === id)

  function add(doc: LabelDocument): PrintedEntry {
    const entry = createPrintedEntry(doc)
    items.value.unshift(entry)
    return entry
  }

  function remove(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function clear() {
    items.value = []
  }

  return { items, count, find, add, remove, clear }
})
