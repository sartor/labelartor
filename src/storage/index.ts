/**
 * The app's localStorage state: every key under one prefix, and one version
 * for the whole set, kept in the `version` key.
 *
 * When a stored shape changes, bump {@link STORAGE_VERSION} and add a step
 * to {@link STORAGE_MIGRATIONS} that rewrites the affected keys. The steps
 * run once, at start-up, before any store reads its keys; state written by
 * a newer build is left untouched.
 *
 * Version history:
 * 1. First version. Keys `label.*`, `settings.*`, `icons.*`,
 *    `printer.autoConnect`, `project.labels` (the open project),
 *    `projects.*` and `history.items`, each holding one JSON value.
 *
 * `index.html` reads `settings.colorMode` before the app starts; a
 * migration that renames it must update that script as well.
 */

export const STORAGE_PREFIX = 'pt-labels:'
export const STORAGE_VERSION = 1

const VERSION_KEY = 'version'

/** The part of the Storage interface the app uses; tests pass a fake. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>

/** The app's keys (without the prefix) as JSON values, for migration steps. */
export interface AppStorage {
  /** The app's keys present in storage, without the prefix. */
  keys(): string[]
  /** The parsed value, or undefined when the key is missing or not valid JSON. */
  get<T = unknown>(key: string): T | undefined
  set(key: string, value: unknown): void
  remove(key: string): void
}

export type StorageMigration = (storage: AppStorage) => void

/**
 * Each step upgrades the state from the version it is keyed by to the next
 * one, e.g. `1: (s) => s.set('project.labels', s.get('labels') ?? [])` once
 * version 2 exists.
 */
export const STORAGE_MIGRATIONS: Readonly<Record<number, StorageMigration>> = {}

export function appStorage(storage: StorageLike): AppStorage {
  return {
    keys() {
      const keys: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key?.startsWith(STORAGE_PREFIX)) keys.push(key.slice(STORAGE_PREFIX.length))
      }
      return keys
    },
    get<T>(key: string): T | undefined {
      const raw = storage.getItem(STORAGE_PREFIX + key)
      if (raw === null) return undefined
      try {
        return JSON.parse(raw) as T
      } catch {
        return undefined
      }
    },
    set(key, value) {
      storage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
    },
    remove(key) {
      storage.removeItem(STORAGE_PREFIX + key)
    },
  }
}

/**
 * Brings the stored state up to the current version and records that
 * version. Returns the version the state has afterwards: the current one,
 * or a newer one that was left alone.
 */
export function migrateStorage(
  storage: StorageLike,
  { version = STORAGE_VERSION, migrations = STORAGE_MIGRATIONS } = {},
): number {
  const app = appStorage(storage)
  const stored = app.get<unknown>(VERSION_KEY)
  const from = typeof stored === 'number' && Number.isInteger(stored) && stored >= 1 ? stored : 1
  if (from > version) {
    console.warn(`Stored state is version ${from}; this build knows up to ${version}.`)
    return from
  }
  for (let v = from; v < version; v++) {
    const step = migrations[v]
    if (!step) throw new Error(`No storage migration from version ${v} to ${v + 1}.`)
    step(app)
  }
  app.set(VERSION_KEY, version)
  return version
}
