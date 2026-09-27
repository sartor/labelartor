<script setup lang="ts">
import { IconMoonStars, IconSun } from '@tabler/icons-vue'
import { computed } from 'vue'

import AppIcon from '@/components/ui/AppIcon.vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

const isDark = computed(() => settings.resolvedColorMode === 'dark')
const nextLabel = computed(() => (isDark.value ? 'Switch to light theme' : 'Switch to dark theme'))
</script>

<template>
  <button
    type="button"
    class="btn btn-sm btn-outline-secondary"
    :title="nextLabel"
    @click="settings.toggleColorMode()"
  >
    <AppIcon :icon="isDark ? IconSun : IconMoonStars" :size="16" />
    <span class="visually-hidden">{{ nextLabel }}</span>
  </button>
</template>
