import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { usePersistedRef } from '@/composables/usePersistedRef'
import { PT_P300BT } from '@/core/printer'

export type ColorMode = 'auto' | 'light' | 'dark'
export type PreviewScale = 1 | 2 | 3

const DEFAULT_OPEN_PANES = {
  preview: true,
  text: true,
  queue: true,
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
  }
})
