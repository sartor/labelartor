/**
 * Icons the user adds by pasting a picture. Each is stored as its 64-dot
 * dots, packed 8 per byte (row by row) and base64-encoded, so it fits in
 * localStorage and in backup files.
 */
import type { LabelEntry } from './entries'
import { IMPORT_MAX_WIDTH } from './iconImport'
import type { IconBitmap } from './iconScale'
import { newEntryId } from './ids'

export interface UserIcon {
  /** Always starts with {@link USER_ICON_PREFIX}. */
  id: string
  name: string
  /** Width of the dots (they are always 64 tall). */
  width: number
  /** Packed dots, base64. */
  dots: string
}

const USER_ICON_PREFIX = 'user-'
const USER_ICON_HEIGHT = 64

export function isUserIconId(id: string): boolean {
  return id.startsWith(USER_ICON_PREFIX)
}

export function newUserIconId(): string {
  return USER_ICON_PREFIX + newEntryId()
}

const packedLength = (width: number) => Math.ceil((width * USER_ICON_HEIGHT) / 8)

export function packDots(bitmap: IconBitmap): string {
  const bytes = new Uint8Array(packedLength(bitmap.width))
  bitmap.data.forEach((d, i) => {
    if (d) bytes[i >> 3]! |= 0x80 >> (i & 7)
  })
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

/** The dots of a stored icon; throws if they do not fit its width. */
export function unpackDots(icon: Pick<UserIcon, 'width' | 'dots'>): IconBitmap {
  const raw = atob(icon.dots)
  if (raw.length !== packedLength(icon.width)) throw new Error('Icon dots do not match its width')
  const data = new Uint8Array(icon.width * USER_ICON_HEIGHT)
  for (let i = 0; i < data.length; i++) data[i] = (raw.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1
  return { width: icon.width, height: USER_ICON_HEIGHT, data }
}

/** Whether a value read from a file or storage is a well-formed user icon. */
export function isUserIcon(value: unknown): value is UserIcon {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.id !== 'string' || !isUserIconId(v.id)) return false
  if (typeof v.name !== 'string' || !v.name) return false
  if (
    !Number.isInteger(v.width) ||
    (v.width as number) < 1 ||
    (v.width as number) > IMPORT_MAX_WIDTH
  )
    return false
  if (typeof v.dots !== 'string') return false
  try {
    unpackDots({ width: v.width as number, dots: v.dots })
    return true
  } catch {
    return false
  }
}

/** Ids of the user icons the labels use. */
export function userIconsUsedBy(labels: readonly LabelEntry[]): Set<string> {
  const ids = new Set<string>()
  for (const label of labels)
    for (const block of label.doc.blocks)
      if (block.kind === 'icon' && isUserIconId(block.icon)) ids.add(block.icon)
  return ids
}
