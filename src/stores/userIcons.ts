import { defineStore } from 'pinia'
import { watch } from 'vue'

import { usePersistedRef } from '@/composables/usePersistedRef'
import {
  isUserIcon,
  newUserIconId,
  packDots,
  setUserIcons,
  type IconBitmap,
  type UserIcon,
} from '@/core/label'
import { useRasterCacheStore } from '@/stores/rasterCache'

/** Icons the user pasted in, kept in the browser and in backups. */
export const useUserIconsStore = defineStore('userIcons', () => {
  const items = usePersistedRef<UserIcon[]>('icons.user', [])
  // Broken entries are dropped rather than breaking every label.
  if (!Array.isArray(items.value)) items.value = []
  items.value = items.value.filter(isUserIcon)

  const cache = useRasterCacheStore()

  // The label code finds icons in its own registry; keep it in step at once,
  // so a component showing a new icon never looks it up too early.
  watch(items, (icons) => setUserIcons(icons), { immediate: true, deep: true, flush: 'sync' })

  const defaultName = () => `Icon ${items.value.length + 1}`

  function add(name: string, bitmap: IconBitmap): string {
    const id = newUserIconId()
    items.value = [...items.value, { id, name, width: bitmap.width, dots: packDots(bitmap) }]
    return id
  }

  function remove(id: string) {
    items.value = items.value.filter((icon) => icon.id !== id)
    // Saved labels drawn with it render again, without it.
    cache.clear()
  }

  /** Adds the incoming icons whose id is not present yet; returns how many. */
  function merge(incoming: readonly UserIcon[]): number {
    const known = new Set(items.value.map((icon) => icon.id))
    const fresh = incoming.filter((icon) => !known.has(icon.id))
    if (fresh.length) {
      items.value = [...items.value, ...fresh]
      cache.clear()
    }
    return fresh.length
  }

  return { items, defaultName, add, remove, merge }
})
