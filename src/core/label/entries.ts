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
