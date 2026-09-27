import type { LabelDocument } from '@/core/label'
import { useLabelStore, type EditingRef } from '@/stores/label'

/** Loads a saved label into the editor and brings the editor into view. */
export function useOpenInEditor() {
  const label = useLabelStore()

  function open(doc: LabelDocument, from: EditingRef) {
    label.load(doc, from)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return { open, scrollTo }
}
