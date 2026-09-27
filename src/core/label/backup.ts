/**
 * File formats: a full backup (queue, history, projects) and a single
 * project. Plain JSON, validated on import.
 *
 * Every file names the app, its `kind` and a format `version`. When the
 * shape changes, bump {@link FORMAT_VERSION} and add a step to
 * {@link MIGRATIONS} that upgrades a file of the previous version: import
 * then still reads every older file, and refuses files written by a newer
 * app with a clear message instead of a wrong guess.
 *
 * Version history:
 * 1. First public format: `app`, `kind`, `version`, `exportedAt`, then the
 *    content: `queue`, `history` and `projects` in a backup, `project` in a
 *    project file.
 */

import type { LabelEntry, PrintedEntry } from './entries'
import type { Project } from './projects'
import type { LabelDocument, TextAlign } from './types'

export const FILE_APP = 'labelartor'
export const FORMAT_VERSION = 1

interface FileHeader {
  app: typeof FILE_APP
  version: typeof FORMAT_VERSION
  exportedAt: string
}

export interface Backup extends FileHeader {
  kind: 'backup'
  queue: LabelEntry[]
  history: PrintedEntry[]
  projects: Project[]
}

export interface ProjectFile extends FileHeader {
  kind: 'project'
  project: Project
}

export class BackupError extends Error {
  override name = 'BackupError'
}

type RawFile = Record<string, unknown>

/**
 * Each step upgrades a file from the version it is keyed by to the next one,
 * e.g. `1: (data) => ({ ...data, labels: data.queue })` once version 2 exists.
 */
const MIGRATIONS: Readonly<Record<number, (data: RawFile) => RawFile>> = {}

const pad = (n: number) => String(n).padStart(2, '0')
const localDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

function header(): FileHeader {
  return { app: FILE_APP, version: FORMAT_VERSION, exportedAt: new Date().toISOString() }
}

export function createBackup(
  queue: readonly LabelEntry[],
  history: readonly PrintedEntry[],
  projects: readonly Project[],
): Backup {
  return {
    ...header(),
    kind: 'backup',
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
  const data = upgrade(parseJson(json))
  if (data.kind !== 'backup') throw new BackupError('This is not a labels backup file.')
  return {
    ...parsedHeader(data),
    kind: 'backup',
    queue: parseEntries(data.queue, 'queue'),
    history: parsePrintedEntries(data.history),
    projects: parseProjects(data.projects),
  }
}

export function createProjectFile(project: Project): ProjectFile {
  return { ...header(), kind: 'project', project }
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
  const data = upgrade(parseJson(json))
  if (data.kind !== 'project') throw new BackupError('This is not a project file.')
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

const isRecord = (value: unknown): value is RawFile =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {
    throw new BackupError('The file is not valid JSON.')
  }
}

/**
 * Checks the file header and brings an older file up to the current
 * version, one migration step at a time.
 */
function upgrade(data: unknown): RawFile {
  const notOurs = new BackupError('This is not a Labelartor file.')
  if (!isRecord(data) || !Number.isInteger(data.version) || (data.version as number) < 1) {
    throw notOurs
  }
  const version = data.version as number
  if (version > FORMAT_VERSION) {
    throw new BackupError(
      `This file was made by a newer Labelartor (file format ${version}; this app reads ` +
        `up to ${FORMAT_VERSION}). Update the app to import it.`,
    )
  }
  let current = data
  for (let v = version; v < FORMAT_VERSION; v++) {
    const step = MIGRATIONS[v]
    if (!step) throw new Error(`No migration from file format ${v} to ${v + 1}.`)
    current = step(current)
  }
  if (current.app !== FILE_APP) throw notOurs
  return current
}

function parsedHeader(data: RawFile): FileHeader {
  return {
    app: FILE_APP,
    version: FORMAT_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
  }
}

function numberAt(value: RawFile, key: string, where: string): number {
  const n = value[key]
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new BackupError(`${where}: missing "${key}".`)
  }
  return n
}

function stringAt(value: RawFile, key: string, where: string): string {
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
    printedAt: numberAt((value as RawFile[])[i]!, 'printedAt', `history label ${i + 1}`),
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
