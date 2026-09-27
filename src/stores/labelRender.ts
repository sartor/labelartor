import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'

import { findBundledFont } from '@/core/fonts'
import {
  isDocumentFontLoaded,
  renderDocument,
  type LabelDocument,
  type TextLayout,
} from '@/core/label'
import type { RasterImage, TapeSpec } from '@/core/printer'
import { useLabelStore } from '@/stores/label'
import { usePrinterStore } from '@/stores/printer'
import { useSettingsStore } from '@/stores/settings'

/**
 * Renders the label being edited for the loaded tape and keeps its printer
 * raster up to date. The raster is the single source for preview and print.
 */
export const useLabelRenderStore = defineStore('labelRender', () => {
  const label = useLabelStore()
  const printer = usePrinterStore()
  const settings = useSettingsStore()

  const layout = shallowRef<TextLayout | null>(null)
  const raster = shallowRef<RasterImage | null>(null)
  const error = ref<string | null>(null)
  /** Family whose glyphs are being downloaded, if any. */
  const loadingFont = ref<string | null>(null)
  /** Label length the text alone needs, before any extra tape. */
  const naturalLengthMm = ref(0)
  /** Length of the raster that will be printed. */
  const lengthMm = ref(0)
  /** 0..1, share of dots the outlines cover cleanly (see measureSharpness). */
  const sharpness = ref(0)

  // Ignore results of renders superseded while waiting for a font.
  let generation = 0

  async function render(doc: LabelDocument, tape: TapeSpec, countLead: boolean) {
    const current = ++generation
    loadingFont.value = isDocumentFontLoaded(doc) ? null : doc.fontFamily
    try {
      const result = await renderDocument(doc, { tape, countLead, withSharpness: true })
      if (current !== generation) return
      layout.value = result.layout
      raster.value = result.raster
      naturalLengthMm.value = result.naturalLengthMm
      lengthMm.value = result.lengthMm
      sharpness.value = result.sharpness
      error.value = null
    } catch (e) {
      if (current !== generation) return
      raster.value = null
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      if (current === generation) loadingFont.value = null
    }
  }

  watch(
    () => [label.document, printer.tape, settings.showTapeLead] as const,
    ([doc, tape, countLead]) => render(doc, tape, countLead),
    { immediate: true },
  )

  const loadingFontLabel = computed(() =>
    loadingFont.value ? (findBundledFont(loadingFont.value)?.label ?? loadingFont.value) : null,
  )

  return {
    layout,
    raster,
    error,
    loadingFont,
    loadingFontLabel,
    naturalLengthMm,
    lengthMm,
    sharpness,
  }
})
