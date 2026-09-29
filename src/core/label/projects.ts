/** A project: a named set of labels. */

import { cloneDocument } from './blocks'
import type { LabelEntry } from './entries'
import { newEntryId } from './ids'

export interface Project {
  id: string
  name: string
  createdAt: number
  savedAt: number
  labels: LabelEntry[]
  /** Tape the labels needed when saved, in mm (lead included). */
  tapeMm: number
}

export function createProject(name: string, labels: LabelEntry[], tapeMm: number): Project {
  const now = Date.now()
  return { id: newEntryId(), name, createdAt: now, savedAt: now, labels, tapeMm }
}

/** Deep copy so later edits to the open labels do not change the saved project (or vice versa). */
export function copyLabels(labels: readonly LabelEntry[]): LabelEntry[] {
  return labels.map((entry) => ({ ...entry, doc: cloneDocument(entry.doc) }))
}
