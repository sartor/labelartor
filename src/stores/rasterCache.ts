import { defineStore } from 'pinia'
import { reactive, shallowReactive } from 'vue'

import { renderDocument, type LabelDocument } from '@/core/label'
import type { RasterImage } from '@/core/printer'
import { usePrinterStore } from '@/stores/printer'
import { useSettingsStore } from '@/stores/settings'

export interface CachedRender {
  /** False until the font has loaded and the label is rendered. */
  ready: boolean
  raster: RasterImage | null
  lengthMm: number
  error: string | null
}

/**
 * Rendered rasters for saved labels (queue, history), keyed by document and
 * tape, so lists can show every label at real size without re-rendering.
 */
export const useRasterCacheStore = defineStore('rasterCache', () => {
  const printer = usePrinterStore()
  const settings = useSettingsStore()

  const entries = shallowReactive(new Map<string, CachedRender>())
  const pending = new Map<string, Promise<CachedRender>>()

  const keyOf = (doc: LabelDocument) =>
    JSON.stringify([doc, printer.tape.printableDots, settings.showTapeLead])

  async function fill(entry: CachedRender, doc: LabelDocument): Promise<CachedRender> {
    try {
      const result = await renderDocument(doc, {
        tape: printer.tape,
        countLead: settings.showTapeLead,
      })
      entry.raster = result.raster
      entry.lengthMm = result.lengthMm
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error)
    } finally {
      entry.ready = true
    }
    return entry
  }

  /** Reactive render of `doc` for the current tape; starts rendering on first use. */
  function get(doc: LabelDocument): CachedRender {
    const key = keyOf(doc)
    let entry = entries.get(key)
    if (!entry) {
      entry = reactive<CachedRender>({ ready: false, raster: null, lengthMm: 0, error: null })
      entries.set(key, entry)
      pending.set(key, fill(entry, doc))
    }
    return entry
  }

  /** Like {@link get}, resolved once the render is done. */
  function ensure(doc: LabelDocument): Promise<CachedRender> {
    const entry = get(doc)
    return entry.ready ? Promise.resolve(entry) : pending.get(keyOf(doc))!
  }

  return { get, ensure }
})
