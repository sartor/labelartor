import { describe, expect, test } from 'bun:test'

import {
  BackupError,
  FILE_APP,
  FORMAT_VERSION,
  backupFileName,
  createBackup,
  createProjectFile,
  mergeEntries,
  parseBackup,
  parseProjectFile,
  projectFileName,
} from '../backup'
import { createEntry, createPrintedEntry } from '../entries'
import { createProject } from '../projects'
import type { LabelDocument } from '../types'

const doc: LabelDocument = {
  text: 'Hello',
  fontFamily: 'Roboto Variable',
  bold: true,
  fontSizePx: 0,
  align: 'center',
  lineGap: 0,
  lengthMm: 40,
  tapeAlign: 'right',
}

/** A file with a valid header and whatever else the test needs. */
const file = (content: Record<string, unknown>) =>
  JSON.stringify({ app: FILE_APP, version: FORMAT_VERSION, ...content })

const backupFile = (content: Record<string, unknown> = {}) =>
  file({ kind: 'backup', queue: [], history: [], projects: [], ...content })

const bareEntry = { id: 'a', createdAt: 1, doc: { text: 'x', fontFamily: 'F' } }

describe('file header', () => {
  test('exported files name the app, their kind and the format version', () => {
    const backup = createBackup([], [], [])
    expect(backup).toMatchObject({ app: FILE_APP, version: FORMAT_VERSION, kind: 'backup' })
    expect(backup.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    const project = createProjectFile(createProject('P', [], 0))
    expect(project).toMatchObject({ app: FILE_APP, version: FORMAT_VERSION, kind: 'project' })
    expect(project.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  test('refuses files from a newer app with a clear message', () => {
    const newer = JSON.stringify({ app: FILE_APP, version: FORMAT_VERSION + 1, kind: 'backup' })
    expect(() => parseBackup(newer)).toThrow(/newer Labelartor.*Update the app/)
    expect(() => parseProjectFile(newer)).toThrow(/newer Labelartor/)
  })

  test('refuses files without a valid header', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError)
    expect(() => parseBackup('{"queue":[],"history":[]}')).toThrow('not a Labelartor file')
    expect(() => parseBackup('{"version":0,"queue":[]}')).toThrow('not a Labelartor file')
    expect(() => parseBackup('{"version":"1","queue":[]}')).toThrow('not a Labelartor file')
    const noApp = JSON.stringify({ version: FORMAT_VERSION, kind: 'backup', queue: [] })
    expect(() => parseBackup(noApp)).toThrow('not a Labelartor file')
    const otherApp = JSON.stringify({ app: 'other', version: FORMAT_VERSION, kind: 'backup' })
    expect(() => parseBackup(otherApp)).toThrow('not a Labelartor file')
  })

  test('requires the kind', () => {
    const noKind = file({ queue: [], history: [], projects: [] })
    expect(() => parseBackup(noKind)).toThrow('not a labels backup file')
    expect(() => parseProjectFile(file({ project: createProject('P', [], 0) }))).toThrow(
      'not a project file',
    )
  })
})

describe('backup', () => {
  test('round-trips queue, history and projects', () => {
    const queue = [createEntry(doc)]
    const history = [createPrintedEntry({ ...doc, text: 'Printed' })]
    const projects = [createProject('Kitchen', [createEntry(doc)], 123.4)]
    const parsed = parseBackup(JSON.stringify(createBackup(queue, history, projects)))
    expect(parsed.queue).toEqual(queue)
    expect(parsed.history).toEqual(history)
    expect(parsed.projects).toEqual(projects)
  })

  test('fills defaults for optional label fields', () => {
    const parsed = parseBackup(backupFile({ queue: [bareEntry] }))
    expect(parsed.queue[0]!.doc).toEqual({
      text: 'x',
      fontFamily: 'F',
      bold: false,
      fontSizePx: 0,
      align: 'left',
      lineGap: 0,
      lengthMm: 0,
      tapeAlign: 'left',
    })
  })

  test('requires every list', () => {
    expect(() => parseBackup(file({ kind: 'backup', queue: [], history: [] }))).toThrow(
      'The projects list is missing.',
    )
    expect(() => parseBackup(file({ kind: 'backup', history: [], projects: [] }))).toThrow(
      'The queue list is missing.',
    )
  })

  test('rejects broken labels and project files', () => {
    expect(() => parseBackup(backupFile({ queue: [{ id: 'a' }] }))).toThrow(
      'queue label 1: not a label.',
    )
    expect(() => parseBackup(backupFile({ history: [bareEntry] }))).toThrow('missing "printedAt"')
    const project = JSON.stringify(createProjectFile(createProject('P', [], 0)))
    expect(() => parseBackup(project)).toThrow('not a labels backup file')
  })

  test('file name carries the local date', () => {
    expect(backupFileName(new Date(2026, 8, 27, 0, 30))).toBe('labelartor-2026-09-27.json')
  })

  test('merge keeps existing entries and skips duplicates', () => {
    const a = createEntry(doc)
    const b = createEntry(doc)
    const { merged, added } = mergeEntries([a], [a, b])
    expect(merged.map((e) => e.id)).toEqual([a.id, b.id])
    expect(added).toBe(1)
  })
})

describe('project file', () => {
  test('round-trips a project', () => {
    const project = createProject('Server rack', [createEntry(doc), createEntry(doc)], 99.5)
    expect(parseProjectFile(JSON.stringify(createProjectFile(project)))).toEqual(project)
  })

  test('rejects backups and broken projects', () => {
    expect(() => parseProjectFile(JSON.stringify(createBackup([], [], [])))).toThrow(
      'not a project file',
    )
    const unnamed = file({ kind: 'project', project: { id: 'p', name: '', labels: [] } })
    expect(() => parseProjectFile(unnamed)).toThrow('missing "name"')
  })

  test('file name is made from the project name', () => {
    const named = createProject('Кухня / Kitchen 2!', [], 0)
    expect(projectFileName(named)).toBe('labelartor-project-кухня-kitchen-2.json')
    const symbols = createProject('***', [], 0)
    expect(projectFileName(symbols)).toBe(`labelartor-project-${symbols.id}.json`)
  })
})
