/**
 * File formats: a full backup (queue, history, projects) and a single
 * project. Plain JSON, validated on import.
 */

import type { LabelEntry, PrintedEntry } from './entries'
import type { Project } from './projects'
import type { LabelDocument, TextAlign } from './types'

export const BACKUP_VERSION = 1

export interface Backup {
  version: typeof BACKUP_VERSION
  exportedAt: string
  queue: LabelEntry[]
  history: PrintedEntry[]
  projects: Project[]
}

export interface ProjectFile {
  version: typeof BACKUP_VERSION
  kind: 'project'
  project: Project
}

export class BackupError extends Error {
  override name = 'BackupError'
}

const pad = (n: number) => String(n).padStart(2, '0')
const localDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export function createBackup(
  queue: readonly LabelEntry[],
  history: readonly PrintedEntry[],
  projects: readonly Project[],
): Backup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    queue: [...queue],
    history: [...history],
    projects: [...projects],
  }
}

/** `labelartor-YYYY-MM-DD.json`, dated in local time. */
export function backupFileName(date = new Date()): string {
  return `labelartor-${localDate(date)}.json`
}

/** Parses and validates a backup; throws {@link BackupError} on anything unexpected. */
export function parseBackup(json: string): Backup {
  const data = parseJson(json)
  if (!isRecord(data) || data.version !== BACKUP_VERSION || data.kind === 'project') {
    throw new BackupError('This is not a labels backup file.')
  }
  return {
    version: BACKUP_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    queue: parseEntries(data.queue, 'queue'),
    history: parsePrintedEntries(data.history),
    // Backups made before projects existed have none.
    projects: data.projects === undefined ? [] : parseProjects(data.projects),
  }
}

export function createProjectFile(project: Project): ProjectFile {
  return { version: BACKUP_VERSION, kind: 'project', project }
}

/** `labelartor-project-<name>.json`, with the name reduced to safe characters. */
export function projectFileName(project: Project): string {
  const slug = project.name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return `labelartor-project-${slug || project.id}.json`
}

export function parseProjectFile(json: string): Project {
  const data = parseJson(json)
  if (!isRecord(data) || data.version !== BACKUP_VERSION || data.kind !== 'project') {
    throw new BackupError('This is not a project file.')
  }
  return parseProject(data.project, 'project')
}

/** Appends the incoming entries whose id is not present yet. */
export function mergeEntries<T extends { id: string }>(
  existing: readonly T[],
  incoming: readonly T[],
): { merged: T[]; added: number } {
  const known = new Set(existing.map((entry) => entry.id))
  const fresh = incoming.filter((entry) => !known.has(entry.id))
  return { merged: [...existing, ...fresh], added: fresh.length }
}

const ALIGNS: readonly TextAlign[] = ['left', 'center', 'right']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {
    throw new BackupError('The file is not valid JSON.')
  }
}

function numberAt(value: Record<string, unknown>, key: string, where: string): number {
  const n = value[key]
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new BackupError(`${where}: missing "${key}".`)
  }
  return n
}

function stringAt(value: Record<string, unknown>, key: string, where: string): string {
  const s = value[key]
  if (typeof s !== 'string' || !s) throw new BackupError(`${where}: missing "${key}".`)
  return s
}

function parseDocument(value: unknown, where: string): LabelDocument {
  if (!isRecord(value) || typeof value.text !== 'string' || typeof value.fontFamily !== 'string') {
    throw new BackupError(`${where}: not a label.`)
  }
  const align = (key: string): TextAlign =>
    ALIGNS.includes(value[key] as TextAlign) ? (value[key] as TextAlign) : 'left'
  const number = (key: string, fallback: number) =>
    typeof value[key] === 'number' && Number.isFinite(value[key]) ? value[key] : fallback
  return {
    text: value.text,
    fontFamily: value.fontFamily,
    bold: value.bold === true,
    fontSizePx: number('fontSizePx', 0),
    align: align('align'),
    lineHeight: number('lineHeight', 1),
    lengthMm: number('lengthMm', 0),
    tapeAlign: align('tapeAlign'),
  }
}

function parseEntries(value: unknown, list: string): LabelEntry[] {
  if (!Array.isArray(value)) throw new BackupError(`The ${list} list is missing.`)
  return value.map((item, i) => {
    const where = `${list} label ${i + 1}`
    if (!isRecord(item)) throw new BackupError(`${where}: not a label.`)
    return {
      id: stringAt(item, 'id', where),
      doc: parseDocument(item.doc, where),
      createdAt: numberAt(item, 'createdAt', where),
    }
  })
}

function parsePrintedEntries(value: unknown): PrintedEntry[] {
  return parseEntries(value, 'history').map((entry, i) => ({
    ...entry,
    printedAt: numberAt(
      (value as Record<string, unknown>[])[i]!,
      'printedAt',
      `history label ${i + 1}`,
    ),
  }))
}

function parseProject(value: unknown, where: string): Project {
  if (!isRecord(value)) throw new BackupError(`${where}: not a project.`)
  const name = stringAt(value, 'name', where)
  return {
    id: stringAt(value, 'id', where),
    name,
    createdAt: numberAt(value, 'createdAt', where),
    savedAt: numberAt(value, 'savedAt', where),
    labels: parseEntries(value.labels, `${where} “${name}”`),
    tapeMm: typeof value.tapeMm === 'number' && Number.isFinite(value.tapeMm) ? value.tapeMm : 0,
  }
}

function parseProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) throw new BackupError('The projects list is missing.')
  return value.map((item, i) => parseProject(item, `project ${i + 1}`))
}
