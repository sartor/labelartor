/** Saved labels: project and history entries wrap a document with identity and time. */

import { cloneDocument, isLabelDocument } from './blocks'
import { newEntryId } from './ids'
import type { LabelBlock, LabelDocument } from './types'

export interface LabelEntry {
  id: string
  doc: LabelDocument
  createdAt: number
}

export interface PrintedEntry extends LabelEntry {
  printedAt: number
}

export function createEntry(doc: LabelDocument): LabelEntry {
  return { id: newEntryId(), doc: cloneDocument(doc), createdAt: Date.now() }
}

/** Whether a stored value is a label in the current shape (anything older is dropped). */
export function isLabelEntry(value: unknown): value is LabelEntry {
  return isLabelDocument((value as Partial<LabelEntry> | null)?.doc)
}

export function createPrintedEntry(doc: LabelDocument): PrintedEntry {
  return { ...createEntry(doc), printedAt: Date.now() }
}

const TEXT_KEYS = ['id', 'text', 'fontFamily', 'bold', 'fontSizePx', 'align', 'lineGap'] as const
const ICON_KEYS = ['id', 'icon', 'size'] as const
const SPACE_KEYS = ['id', 'lengthMm'] as const

function sameBlock(a: LabelBlock, b: LabelBlock): boolean {
  if (a.kind === 'text' && b.kind === 'text') return TEXT_KEYS.every((key) => a[key] === b[key])
  if (a.kind === 'icon' && b.kind === 'icon') return ICON_KEYS.every((key) => a[key] === b[key])
  if (a.kind === 'space' && b.kind === 'space') return SPACE_KEYS.every((key) => a[key] === b[key])
  return false
}

/** Same label content, whatever order the fields were written in. */
export function sameDocument(a: LabelDocument, b: LabelDocument): boolean {
  return (
    a.blocks.length === b.blocks.length &&
    a.blocks.every((block, i) => sameBlock(block, b.blocks[i]!))
  )
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
