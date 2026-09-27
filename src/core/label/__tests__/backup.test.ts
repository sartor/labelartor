import { describe, expect, test } from 'bun:test'

import {
  BackupError,
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
  lineHeight: 1,
  lengthMm: 40,
  tapeAlign: 'right',
}

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

  test('fills defaults for fields older files may lack', () => {
    const json = JSON.stringify({
      version: 1,
      queue: [{ id: 'a', createdAt: 1, doc: { text: 'x', fontFamily: 'F' } }],
      history: [],
    })
    const parsed = parseBackup(json)
    expect(parsed.projects).toEqual([])
    expect(parsed.queue[0]!.doc).toEqual({
      text: 'x',
      fontFamily: 'F',
      bold: false,
      fontSizePx: 0,
      align: 'left',
      lineHeight: 1,
      lengthMm: 0,
      tapeAlign: 'left',
    })
  })

  test('rejects files that are not backups', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError)
    expect(() => parseBackup('{"version":2,"queue":[],"history":[]}')).toThrow(BackupError)
    expect(() => parseBackup('{"version":1,"queue":[{"id":"a"}],"history":[]}')).toThrow(
      'queue label 1: not a label.',
    )
    expect(() =>
      parseBackup(
        '{"version":1,"queue":[],"history":[{"id":"a","createdAt":1,"doc":{"text":"x","fontFamily":"F"}}]}',
      ),
    ).toThrow('missing "printedAt"')
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
    expect(() => parseProjectFile('{"version":1,"queue":[],"history":[]}')).toThrow(
      'not a project file',
    )
    expect(() =>
      parseProjectFile('{"version":1,"kind":"project","project":{"id":"p","name":"","labels":[]}}'),
    ).toThrow('missing "name"')
  })

  test('file name is made from the project name', () => {
    const named = createProject('Кухня / Kitchen 2!', [], 0)
    expect(projectFileName(named)).toBe('labelartor-project-кухня-kitchen-2.json')
    const symbols = createProject('***', [], 0)
    expect(projectFileName(symbols)).toBe(`labelartor-project-${symbols.id}.json`)
  })
})
