import { describe, expect, test } from 'bun:test'

import {
  STORAGE_MIGRATIONS,
  STORAGE_PREFIX,
  STORAGE_VERSION,
  appStorage,
  migrateStorage,
  type StorageLike,
  type StorageMigration,
} from '..'

/** In-memory stand-in for localStorage. */
function fakeStorage(
  entries: Record<string, string> = {},
): StorageLike & { dump(): Record<string, string> } {
  const map = new Map(Object.entries(entries))
  return {
    get length() {
      return map.size
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    dump: () => Object.fromEntries(map),
  }
}

const K = (key: string) => STORAGE_PREFIX + key

describe('appStorage', () => {
  test('lists, reads, writes and removes the app keys without their prefix', () => {
    const storage = fakeStorage({ [K('a')]: '1', 'other:x': '2', [K('bad')]: '{oops' })
    const app = appStorage(storage)
    expect(app.keys().sort()).toEqual(['a', 'bad'])
    expect(app.get<number>('a')).toBe(1)
    expect(app.get('bad')).toBeUndefined()
    expect(app.get('missing')).toBeUndefined()
    app.set('list', [1, 2])
    expect(storage.getItem(K('list'))).toBe('[1,2]')
    app.remove('a')
    expect(storage.getItem(K('a'))).toBeNull()
  })
})

describe('migrateStorage', () => {
  test('stamps fresh storage with the current version', () => {
    const storage = fakeStorage()
    expect(migrateStorage(storage)).toBe(STORAGE_VERSION)
    expect(storage.getItem(K('version'))).toBe(String(STORAGE_VERSION))
  })

  test('has a step for every version below the current one', () => {
    for (let v = 1; v < STORAGE_VERSION; v++) expect(typeof STORAGE_MIGRATIONS[v]).toBe('function')
  })

  test('runs the steps in order from the stored version, treating none as 1', () => {
    const migrations: Record<number, StorageMigration> = {
      1: (s) => s.set('project.labels', s.get('labels') ?? []),
      2: (s) => s.set('settings.zoom', (s.get<number>('settings.previewScale') ?? 1) * 100),
    }
    const storage = fakeStorage({
      [K('labels')]: '[{"id":"a"}]',
      [K('settings.previewScale')]: '2',
    })
    expect(migrateStorage(storage, { version: 3, migrations })).toBe(3)
    expect(storage.dump()).toEqual({
      [K('labels')]: '[{"id":"a"}]',
      [K('project.labels')]: '[{"id":"a"}]',
      [K('settings.previewScale')]: '2',
      [K('settings.zoom')]: '200',
      [K('version')]: '3',
    })

    // Already at version 2: only the second step runs.
    const later = fakeStorage({ [K('version')]: '2', [K('settings.previewScale')]: '3' })
    migrateStorage(later, { version: 3, migrations })
    expect(later.getItem(K('project.labels'))).toBeNull()
    expect(later.getItem(K('settings.zoom'))).toBe('300')
  })

  test('leaves state from a newer build alone', () => {
    const storage = fakeStorage({ [K('version')]: '9', [K('project.labels')]: '[]' })
    expect(migrateStorage(storage, { version: 2, migrations: { 1: () => {} } })).toBe(9)
    expect(storage.dump()).toEqual({ [K('version')]: '9', [K('project.labels')]: '[]' })
  })

  test('treats a broken version value as 1', () => {
    const storage = fakeStorage({ [K('version')]: '"x"' })
    let ran = false
    migrateStorage(storage, { version: 2, migrations: { 1: () => (ran = true) } })
    expect(ran).toBe(true)
    expect(storage.getItem(K('version'))).toBe('2')
  })

  test('fails loudly when a step is missing', () => {
    expect(() =>
      migrateStorage(fakeStorage(), { version: 3, migrations: { 1: () => {} } }),
    ).toThrow('No storage migration from version 2 to 3.')
  })
})
