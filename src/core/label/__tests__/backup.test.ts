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
import { type UserIcon, packDots } from '../userIcons'
import type { LabelDocument } from '../types'

const doc: LabelDocument = {
  blocks: [
    {
      kind: 'text',
      id: 't1',
      text: 'Hello',
      fontFamily: 'Roboto Variable',
      bold: true,
      fontSizePx: 0,
      align: 'center',
      lineGap: 0,
    },
    { kind: 'icon', id: 'i1', icon: 'warning', size: 48 },
    { kind: 'space', id: 's1', lengthMm: 12 },
  ],
}

/** `doc` with other text in its text block. */
const withText = (text: string): LabelDocument => ({
  ...doc,
  blocks: doc.blocks.map((b) => (b.kind === 'text' ? { ...b, text } : { ...b })),
})

/** A file with a valid header and whatever else the test needs. */
const file = (content: Record<string, unknown>) =>
  JSON.stringify({ app: FILE_APP, version: FORMAT_VERSION, ...content })

const backupFile = (content: Record<string, unknown> = {}) =>
  file({ kind: 'backup', openProject: [], history: [], projects: [], ...content })

const bareEntry = {
  id: 'a',
  createdAt: 1,
  doc: { blocks: [{ kind: 'text', id: 'b1', text: 'x', fontFamily: 'F' }] },
}

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
    expect(() => parseBackup('{"openProject":[],"history":[]}')).toThrow('not a Labelartor file')
    expect(() => parseBackup('{"version":0,"openProject":[]}')).toThrow('not a Labelartor file')
    expect(() => parseBackup('{"version":"1","openProject":[]}')).toThrow('not a Labelartor file')
    const noApp = JSON.stringify({ version: FORMAT_VERSION, kind: 'backup', openProject: [] })
    expect(() => parseBackup(noApp)).toThrow('not a Labelartor file')
    const otherApp = JSON.stringify({ app: 'other', version: FORMAT_VERSION, kind: 'backup' })
    expect(() => parseBackup(otherApp)).toThrow('not a Labelartor file')
  })

  test('requires the kind', () => {
    const noKind = file({ openProject: [], history: [], projects: [] })
    expect(() => parseBackup(noKind)).toThrow('not a labels backup file')
    expect(() => parseProjectFile(file({ project: createProject('P', [], 0) }))).toThrow(
      'not a project file',
    )
  })
})

/** A tiny valid user icon: 1 dot wide, top dot set. */
const userIcon = (id: string): UserIcon => ({
  id,
  name: id,
  width: 1,
  dots: packDots({ width: 1, height: 64, data: Uint8Array.from({ length: 64 }, (_, i) => +!i) }),
})

describe('user icons', () => {
  test('round-trip in a backup', () => {
    const icons = [userIcon('user-1'), userIcon('user-2')]
    expect(parseBackup(JSON.stringify(createBackup([], [], [], icons))).userIcons).toEqual(icons)
  })

  test('files without the list import with none', () => {
    expect(parseBackup(backupFile()).userIcons).toEqual([])
  })

  test('broken icons are refused', () => {
    const bad = backupFile({ userIcons: [{ id: 'user-x', name: 'X', width: 5, dots: 'AA==' }] })
    expect(() => parseBackup(bad)).toThrow('user icon 1: not an icon')
    const notUser = backupFile({ userIcons: [{ ...userIcon('user-y'), id: 'bolt' }] })
    expect(() => parseBackup(notUser)).toThrow('user icon 1')
  })
})

describe('backup', () => {
  test('round-trips the open project, history and projects', () => {
    const labels = [createEntry(doc)]
    const history = [createPrintedEntry(withText('Printed'))]
    const projects = [createProject('Kitchen', [createEntry(doc)], 123.4)]
    const parsed = parseBackup(JSON.stringify(createBackup(labels, history, projects)))
    expect(parsed.openProject).toEqual(labels)
    expect(parsed.history).toEqual(history)
    expect(parsed.projects).toEqual(projects)
  })

  test('fills defaults for optional label fields', () => {
    const parsed = parseBackup(backupFile({ openProject: [bareEntry] }))
    expect(parsed.openProject[0]!.doc).toEqual({
      blocks: [
        {
          kind: 'text',
          id: 'b1',
          text: 'x',
          fontFamily: 'F',
          bold: false,
          fontSizePx: 0,
          align: 'left',
          lineGap: 0,
        },
      ],
    })
  })

  test('reads icon blocks and refuses labels in the old single-text shape', () => {
    const icon = {
      id: 'i',
      createdAt: 1,
      doc: { blocks: [{ kind: 'icon', id: 'x', icon: 'bolt', size: 5 }] },
    }
    expect(parseBackup(backupFile({ openProject: [icon] })).openProject[0]!.doc.blocks[0]).toEqual({
      kind: 'icon',
      id: 'x',
      icon: 'bolt',
      size: 64,
    })
    const space = {
      id: 's',
      createdAt: 1,
      doc: { blocks: [{ kind: 'space', id: 'y', lengthMm: 900 }] },
    }
    expect(parseBackup(backupFile({ openProject: [space] })).openProject[0]!.doc.blocks[0]).toEqual(
      {
        kind: 'space',
        id: 'y',
        lengthMm: 200,
      },
    )
    const old = { id: 'o', createdAt: 1, doc: { text: 'x', fontFamily: 'F' } }
    expect(() => parseBackup(backupFile({ openProject: [old] }))).toThrow(
      'open project label 1: not a label.',
    )
  })

  test('requires every list', () => {
    expect(() => parseBackup(file({ kind: 'backup', openProject: [], history: [] }))).toThrow(
      'The projects list is missing.',
    )
    expect(() => parseBackup(file({ kind: 'backup', history: [], projects: [] }))).toThrow(
      'The open project labels are missing.',
    )
  })

  test('rejects broken labels and project files', () => {
    expect(() => parseBackup(backupFile({ openProject: [{ id: 'a' }] }))).toThrow(
      'open project label 1: not a label.',
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
    expect(parseProjectFile(JSON.stringify(createProjectFile(project)))).toEqual({
      project,
      userIcons: [],
    })
  })

  test('carries only the user icons its labels use', () => {
    const used = userIcon('user-a')
    const unused = userIcon('user-b')
    const withIcon = createEntry({ blocks: [{ kind: 'icon', id: 'x', icon: used.id, size: 32 }] })
    const project = createProject('P', [withIcon, createEntry(doc)], 0)
    const parsed = parseProjectFile(JSON.stringify(createProjectFile(project, [used, unused])))
    expect(parsed.userIcons).toEqual([used])
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
