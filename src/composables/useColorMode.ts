import { watchEffect } from 'vue'

import { useSettingsStore } from '@/stores/settings'

/** Applies the color mode to Halfmoon (`data-bs-theme` on <html>). Call once from the root. */
export function useColorMode() {
  const settings = useSettingsStore()
  watchEffect(() =>
    document.documentElement.setAttribute('data-bs-theme', settings.resolvedColorMode),
  )
}
