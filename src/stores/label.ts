import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { usePersistedRef } from '@/composables/usePersistedRef'
import { DEFAULT_FONT_FAMILY, isBundledFont } from '@/core/fonts'
import { LINE_GAP, type LabelDocument, type TextAlign } from '@/core/label'

/** Where the label in the editor came from, when it was opened from a list. */
export interface EditingRef {
  source: 'queue' | 'history'
  id: string
}

/** The label currently being edited (persisted as a draft). */
export const useLabelStore = defineStore('label', () => {
  const text = usePersistedRef('label.text', 'Labelartor')
  const fontFamily = usePersistedRef('label.fontFamily', DEFAULT_FONT_FAMILY)
  const bold = usePersistedRef('label.bold', false)
  const fontSizePx = usePersistedRef<number>('label.fontSizePx', 68)
  const align = usePersistedRef<TextAlign>('label.align', 'center')
  const lineGap = usePersistedRef<number>('label.lineGap', LINE_GAP.default)
  const lengthMm = usePersistedRef<number>('label.lengthMm', 0)
  const tapeAlign = usePersistedRef<TextAlign>('label.tapeAlign', 'left')
  const editing = ref<EditingRef | null>(null)

  // A draft may name a font the app no longer ships.
  if (!isBundledFont(fontFamily.value)) fontFamily.value = DEFAULT_FONT_FAMILY

  const document = computed<LabelDocument>(() => ({
    text: text.value,
    fontFamily: fontFamily.value,
    bold: bold.value,
    fontSizePx: fontSizePx.value,
    align: align.value,
    lineGap: lineGap.value,
    lengthMm: lengthMm.value,
    tapeAlign: tapeAlign.value,
  }))

  /** Replaces the draft with `doc`, remembering where it came from. */
  function load(doc: LabelDocument, from: EditingRef | null = null) {
    text.value = doc.text
    fontFamily.value = isBundledFont(doc.fontFamily) ? doc.fontFamily : DEFAULT_FONT_FAMILY
    bold.value = doc.bold
    fontSizePx.value = doc.fontSizePx
    align.value = doc.align
    lineGap.value = doc.lineGap
    lengthMm.value = doc.lengthMm
    tapeAlign.value = doc.tapeAlign
    editing.value = from
  }

  function stopEditing() {
    editing.value = null
  }

  return {
    text,
    fontFamily,
    bold,
    fontSizePx,
    align,
    lineGap,
    lengthMm,
    tapeAlign,
    editing,
    document,
    load,
    stopEditing,
  }
})
