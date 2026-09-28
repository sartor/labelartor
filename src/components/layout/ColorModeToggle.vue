<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '@/components/ui/AppIcon.vue'
import { IconMoonStars, IconSun } from '@/icons'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

const isDark = computed(() => settings.resolvedColorMode === 'dark')
const nextLabel = computed(() => (isDark.value ? 'Light theme' : 'Dark theme'))
</script>

<template>
  <button
    type="button"
    class="btn btn-sm btn-outline-secondary"
    :title="nextLabel"
    @click="settings.toggleColorMode()"
  >
    <AppIcon :icon="isDark ? IconSun : IconMoonStars" />
    <span class="visually-hidden">{{ nextLabel }}</span>
  </button>
</template>
