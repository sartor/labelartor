import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { usePersistedRef } from '@/composables/usePersistedRef'
import { createEntry, type LabelDocument, type LabelEntry } from '@/core/label'
import { useHistoryStore } from '@/stores/history'
import { usePrinterStore } from '@/stores/printer'
import { useRasterCacheStore } from '@/stores/rasterCache'

/** The labels of the open project, printed as one batch. */
export const useQueueStore = defineStore('queue', () => {
  const items = usePersistedRef<LabelEntry[]>('queue.items', [])
  /** Set while a batch is being printed. */
  const printing = ref<{ index: number; count: number } | null>(null)

  const count = computed(() => items.value.length)
  const isPrinting = computed(() => printing.value !== null)

  const find = (id: string) => items.value.find((item) => item.id === id)

  /** Adds a label at the end. */
  function add(doc: LabelDocument): LabelEntry {
    const entry = createEntry(doc)
    items.value.push(entry)
    return entry
  }

  function update(id: string, doc: LabelDocument): boolean {
    const entry = find(id)
    if (!entry) return false
    entry.doc = { ...doc }
    return true
  }

  function remove(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  /**
   * Prints every label back to back. The labels stay in the project; each is
   * copied to the history as soon as the printer confirms it.
   */
  async function printAll(): Promise<boolean> {
    const printer = usePrinterStore()
    const history = useHistoryStore()
    const cache = useRasterCacheStore()
    if (isPrinting.value || !items.value.length || !printer.canPrint) return false

    const snapshot = [...items.value]
    const rendered = await Promise.all(snapshot.map((entry) => cache.ensure(entry.doc)))
    // Labels with no text render to nothing; skip them.
    const jobs = snapshot.flatMap((entry, i) => {
      const raster = rendered[i]!.raster
      return raster ? [{ entry, raster }] : []
    })
    if (!jobs.length) return false

    printing.value = { index: 0, count: jobs.length }
    try {
      return await printer.printBatch(
        jobs.map((job) => job.raster),
        {
          onJobStart: (index, count) => (printing.value = { index, count }),
          onJobDone: (index) => history.add(jobs[index]!.entry.doc),
        },
      )
    } finally {
      printing.value = null
    }
  }

  return {
    items,
    count,
    printing,
    isPrinting,
    find,
    add,
    update,
    remove,
    printAll,
  }
})
