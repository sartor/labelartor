<script setup lang="ts">
/** Printer details as dropdown menu items (render inside a `.dropdown-menu`). */
import { computed } from 'vue'

import { usePrinterStore } from '@/stores/printer'

const props = defineProps<{
  /** The app's one-line status, the same text the toggle button shows. */
  statusText: string
}>()

const printer = usePrinterStore()

const rows = computed(() => {
  const info = printer.statusInfo
  const status = { label: 'Status', value: props.statusText, danger: false }
  if (!info) return [status]
  return [
    status,
    { label: 'Tape', value: info.media, danger: false },
    { label: 'Colors', value: info.tapeColors, danger: false },
    { label: 'Power', value: info.power, danger: false },
    { label: 'Errors', value: info.errors, danger: !!printer.status?.errors },
  ]
})
</script>

<template>
  <li>
    <h6 class="dropdown-header">{{ printer.statusInfo?.model ?? 'Printer' }}</h6>
  </li>
  <li v-for="row in rows" :key="row.label">
    <span class="dropdown-item-text small d-flex justify-content-between gap-4 py-1 text-nowrap">
      <span class="text-body-secondary">{{ row.label }}</span>
      <span :class="{ 'text-danger': row.danger }">{{ row.value }}</span>
    </span>
  </li>
</template>
