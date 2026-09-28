import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { usePersistedRef } from '@/composables/usePersistedRef'
import { DEFAULT_FONT_FAMILY, isBundledFont } from '@/core/fonts'
import { LINE_GAP, sameDocument, type LabelDocument, type TextAlign } from '@/core/label'
import { useQueueStore } from '@/stores/queue'

/** What a fresh project starts with. */
export const DEFAULT_DOCUMENT: Readonly<LabelDocument> = {
  text: 'Labelartor',
  fontFamily: DEFAULT_FONT_FAMILY,
  bold: false,
  fontSizePx: 68,
  align: 'center',
  lineGap: LINE_GAP.default,
  lengthMm: 0,
  tapeAlign: 'left',
}

/**
 * The label being edited: always one label of the open project, selected in
 * the project panel. Every edit is written into that label at once. The
 * project is never empty; when it would be, a label is added.
 */
export const useLabelStore = defineStore('label', () => {
  const queue = useQueueStore()

  const text = ref(DEFAULT_DOCUMENT.text)
  const fontFamily = ref(DEFAULT_DOCUMENT.fontFamily)
  const bold = ref(DEFAULT_DOCUMENT.bold)
  const fontSizePx = ref(DEFAULT_DOCUMENT.fontSizePx)
  const align = ref<TextAlign>(DEFAULT_DOCUMENT.align)
  const lineGap = ref(DEFAULT_DOCUMENT.lineGap)
  const lengthMm = ref(DEFAULT_DOCUMENT.lengthMm)
  const tapeAlign = ref<TextAlign>(DEFAULT_DOCUMENT.tapeAlign)
  /** Id of the project label being edited; kept across reloads. */
  const selectedId = usePersistedRef<string | null>('label.selectedId', null)

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

  function show(doc: LabelDocument) {
    text.value = doc.text
    // A label may name a font the app no longer ships.
    fontFamily.value = isBundledFont(doc.fontFamily) ? doc.fontFamily : DEFAULT_FONT_FAMILY
    bold.value = doc.bold
    fontSizePx.value = doc.fontSizePx
    align.value = doc.align
    lineGap.value = doc.lineGap
    lengthMm.value = doc.lengthMm
    tapeAlign.value = doc.tapeAlign
  }

  /** Makes the project label with `id` the one being edited. */
  function select(id: string) {
    const entry = queue.find(id)
    if (!entry) return
    selectedId.value = id
    show(entry.doc)
  }

  /** Adds a label to the project (formatted like the current one) and selects it. */
  function addNew(overrides: Partial<LabelDocument> = {}): string {
    const entry = queue.add({ ...document.value, text: 'New label', ...overrides })
    select(entry.id)
    return entry.id
  }

  /** Adds a copy of the label `id` at the end of the project and selects the copy. */
  function clone(id: string) {
    const source = queue.find(id)
    if (!source) return
    select(queue.add({ ...source.doc }).id)
  }

  /** Where the selected label was, to pick its neighbour when it goes away. */
  let lastIndex = 0

  /** Keeps a label selected: the neighbour of a removed one, or a new one in an empty project. */
  function ensureSelection() {
    if (!queue.items.length) {
      const entry = queue.add({ ...DEFAULT_DOCUMENT })
      select(entry.id)
      return
    }
    const index = queue.items.findIndex((entry) => entry.id === selectedId.value)
    if (index >= 0) {
      lastIndex = index
      // The label may have been replaced (a project opened, a backup merged).
      if (!sameDocument(queue.items[index]!.doc, document.value)) {
        show(queue.items[index]!.doc)
      }
      return
    }
    select(queue.items[Math.min(lastIndex, queue.items.length - 1)]!.id)
  }

  ensureSelection()
  watch(() => queue.items.map((entry) => entry.id).join(), ensureSelection)

  // Live editing: every change goes straight into the selected label.
  watch(document, (doc) => {
    const entry = selectedId.value ? queue.find(selectedId.value) : undefined
    if (entry && !sameDocument(entry.doc, doc)) queue.update(entry.id, doc)
  })

  return {
    text,
    fontFamily,
    bold,
    fontSizePx,
    align,
    lineGap,
    lengthMm,
    tapeAlign,
    selectedId,
    document,
    select,
    addNew,
    clone,
  }
})
