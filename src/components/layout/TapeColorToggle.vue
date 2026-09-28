<script setup lang="ts">
/**
 * Preview colours: black text on white tape, or white on black to match a
 * white-on-black cartridge. The data sent to the printer is the same either way.
 */
import { computed } from 'vue'

import AppIcon from '@/components/ui/AppIcon.vue'
import { IconContrast } from '@/icons'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

const title = computed(() => (settings.darkTape ? 'Black on white tape' : 'White on black tape'))
</script>

<template>
  <button
    type="button"
    class="btn btn-sm btn-outline-secondary"
    :class="{ active: settings.darkTape }"
    :aria-pressed="settings.darkTape"
    :title="title"
    @click="settings.darkTape = !settings.darkTape"
  >
    <AppIcon :icon="IconContrast" />
    <span class="visually-hidden">Tape colours</span>
  </button>
</template>
