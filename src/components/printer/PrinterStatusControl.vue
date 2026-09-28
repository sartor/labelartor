<script setup lang="ts">
/**
 * App status and printer connection in one navbar control:
 * a connect button while disconnected, the printer menu once connected.
 * Its colour and label follow the app status (busy, ready, error…), and the
 * details of the last error are printed right after it.
 */
import { computed } from 'vue'

import PrinterStatusMenuItems from '@/components/printer/PrinterStatusMenuItems.vue'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useAppStatus, type StatusTone } from '@/composables/useAppStatus'
import {
  IconAlertOctagon,
  IconAlertTriangle,
  IconBluetooth,
  IconCircleCheck,
  IconCircleX,
  IconRefresh,
  type IconPath,
} from '@/icons'
import { usePrinterStore } from '@/stores/printer'

const printer = usePrinterStore()
const status = useAppStatus()

const tones: Record<StatusTone, { variant: string; icon: IconPath | null }> = {
  busy: { variant: 'btn-outline-primary', icon: null },
  ok: { variant: 'btn-outline-success', icon: IconCircleCheck },
  idle: { variant: 'btn-outline-primary', icon: IconBluetooth },
  warning: { variant: 'btn-outline-warning', icon: IconAlertTriangle },
  danger: { variant: 'btn-outline-danger', icon: IconAlertOctagon },
}

const tone = computed(() => tones[status.value.tone])
const busy = computed(() => status.value.tone === 'busy')

const label = computed(() => {
  if (busy.value) return status.value.text
  if (!printer.isConnected) return 'Connect printer'
  if (status.value.tone === 'ok') return `Printer ready · ${printer.tape.widthMm} mm`
  return status.value.text
})

const title = computed(
  () =>
    status.value.detail ??
    (printer.isConnected ? 'Printer' : 'Pair the printer in Bluetooth settings first'),
)
</script>

<template>
  <span class="visually-hidden" role="status" aria-live="polite">{{ status.text }}</span>

  <span v-if="!printer.supported" class="d-inline-block" :title="status.detail">
    <button type="button" class="btn btn-sm btn-outline-warning" disabled>
      <AppIcon v-if="tone.icon" :icon="tone.icon" class="me-1" />{{ status.text }}
    </button>
  </span>

  <AppDropdown
    v-else-if="printer.isConnected"
    auto-close="outside"
    :toggle-class="`btn btn-sm dropdown-toggle ${tone.variant}`"
    :title="title"
  >
    <template #toggle>
      <span v-if="busy" class="spinner-border spinner-border-sm me-1" aria-hidden="true" />
      <AppIcon v-else-if="tone.icon" :icon="tone.icon" class="me-1" />{{ label }}
    </template>
    <PrinterStatusMenuItems :status-text="status.text" />
    <li><hr class="dropdown-divider" /></li>
    <li>
      <button
        type="button"
        class="dropdown-item"
        :disabled="printer.activity !== 'idle'"
        @click="printer.refreshStatus()"
      >
        <AppIcon :icon="IconRefresh" class="me-2" />Refresh status
      </button>
    </li>
    <li>
      <button type="button" class="dropdown-item text-danger" @click="printer.disconnect()">
        <AppIcon :icon="IconCircleX" class="me-2" />Disconnect
      </button>
    </li>
  </AppDropdown>

  <button
    v-else
    type="button"
    class="btn btn-sm"
    :class="tone.variant"
    :title="title"
    :disabled="printer.connection === 'connecting'"
    @click="printer.connect()"
  >
    <span v-if="busy" class="spinner-border spinner-border-sm me-1" aria-hidden="true" />
    <AppIcon v-else-if="tone.icon" :icon="tone.icon" class="me-1" />{{ label }}
  </button>

  <span v-if="printer.lastError" class="small text-danger" role="alert">
    {{ printer.lastError }}
  </span>
</template>
