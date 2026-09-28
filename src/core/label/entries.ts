/** Saved labels: queue and history entries wrap a document with identity and time. */

import type { LabelDocument } from './types'

export interface LabelEntry {
  id: string
  doc: LabelDocument
  createdAt: number
}

export interface PrintedEntry extends LabelEntry {
  printedAt: number
}

export function newEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createEntry(doc: LabelDocument): LabelEntry {
  return { id: newEntryId(), doc: { ...doc }, createdAt: Date.now() }
}

export function createPrintedEntry(doc: LabelDocument): PrintedEntry {
  return { ...createEntry(doc), printedAt: Date.now() }
}

const DOCUMENT_KEYS: readonly (keyof LabelDocument)[] = [
  'text',
  'fontFamily',
  'bold',
  'fontSizePx',
  'align',
  'lineGap',
  'lengthMm',
  'tapeAlign',
]

/** Same label content, whatever order the fields were written in. */
export function sameDocument(a: LabelDocument, b: LabelDocument): boolean {
  return DOCUMENT_KEYS.every((key) => a[key] === b[key])
}

/** Same labels in the same order. */
export function sameEntries(a: readonly LabelEntry[], b: readonly LabelEntry[]): boolean {
  return (
    a.length === b.length &&
    a.every((entry, i) => {
      const other = b[i]!
      return (
        entry.id === other.id &&
        entry.createdAt === other.createdAt &&
        sameDocument(entry.doc, other.doc)
      )
    })
  )
}
