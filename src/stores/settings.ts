import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { usePersistedRef } from '@/composables/usePersistedRef'
import { ICON_CATEGORIES, rememberIconUse, type IconCategory } from '@/core/label'
import { PT_P300BT } from '@/core/printer'

export type ColorMode = 'auto' | 'light' | 'dark'
export type PreviewScale = 1 | 2 | 3
export type IconFilter = 'recent' | 'all' | IconCategory

const DEFAULT_OPEN_PANES = {
  preview: true,
  content: true,
  project: true,
  projects: true,
  history: true,
}

export const useSettingsStore = defineStore('settings', () => {
  // 'auto' follows the OS until the user toggles. Key is also read by index.html.
  const colorMode = usePersistedRef<ColorMode>('settings.colorMode', 'auto')
  const previewScale = usePersistedRef<PreviewScale>('settings.previewScale', 2)
  const showTapeLead = usePersistedRef('settings.showTapeLead', true)
  /** Preview labels as white text on black tape (a white-on-black cartridge). */
  const darkTape = usePersistedRef('settings.darkTape', false)
  /** Tape width labels are designed for; follows the printer's tape once it reports one. */
  const tapeWidthMm = usePersistedRef<number>('settings.tapeWidthMm', PT_P300BT.defaultTape.widthMm)
  /** When each label icon was last picked, for sorting the picker by recent use. */
  const iconLastUsed = usePersistedRef<Record<string, number>>('icons.lastUsed', {})
  /** What the icon picker lists: recently used, all, or one category. */
  const iconFilter = usePersistedRef<IconFilter>('icons.filter', 'recent')
  const knownFilters: string[] = ['recent', 'all', ...ICON_CATEGORIES.map((c) => c.id)]
  if (!knownFilters.includes(iconFilter.value)) iconFilter.value = 'recent'
  /** Marks an icon as just used; only the 100 most recent are kept. */
  function markIconUsed(id: string) {
    iconLastUsed.value = rememberIconUse(iconLastUsed.value, id, Date.now())
  }
  /** Which panels are expanded. */
  const openPanes = usePersistedRef('settings.openPanes', DEFAULT_OPEN_PANES)
  // Panels added later are open until the user folds them.
  openPanes.value = { ...DEFAULT_OPEN_PANES, ...openPanes.value }

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const systemDark = ref(media.matches)
  media.addEventListener('change', (event) => (systemDark.value = event.matches))

  const resolvedColorMode = computed<'light' | 'dark'>(() =>
    colorMode.value === 'auto' ? (systemDark.value ? 'dark' : 'light') : colorMode.value,
  )

  function toggleColorMode() {
    colorMode.value = resolvedColorMode.value === 'dark' ? 'light' : 'dark'
  }

  return {
    colorMode,
    resolvedColorMode,
    toggleColorMode,
    previewScale,
    showTapeLead,
    darkTape,
    tapeWidthMm,
    openPanes,
    iconLastUsed,
    iconFilter,
    markIconUsed,
  }
})
