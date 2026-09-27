<script setup lang="ts">
/** A saved label at real size in a thin frame; clicking it selects it and opens it. */
import { computed } from 'vue'

import LabelPreview from '@/components/editor/LabelPreview.vue'
import { findBundledFont } from '@/core/fonts'
import { splitLines, type LabelDocument } from '@/core/label'
import { usePrinterStore } from '@/stores/printer'
import { useRasterCacheStore } from '@/stores/rasterCache'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{
  doc: LabelDocument
  /** Extra line for the hover tooltip, e.g. when it was printed. */
  detail?: string
  /** Selected: highlighted and open in the editor. */
  active?: boolean
}>()

const emit = defineEmits<{ open: [] }>()

const printer = usePrinterStore()
const cache = useRasterCacheStore()
const settings = useSettingsStore()

const rendered = computed(() => cache.get(props.doc))

const tooltip = computed(() => {
  const lines = splitLines(props.doc.text).length
  const font = findBundledFont(props.doc.fontFamily)?.label ?? props.doc.fontFamily
  const length = rendered.value.ready ? `${rendered.value.lengthMm.toFixed(1)} mm` : null
  return [
    `${font}${props.doc.bold ? ' bold' : ''} · ${lines} ${lines === 1 ? 'line' : 'lines'}`,
    length,
    props.detail,
    'Click to select and edit',
  ]
    .filter(Boolean)
    .join('\n')
})
</script>

<template>
  <div
    class="d-inline-block mw-100 border rounded-1 overflow-hidden"
    :class="{ 'border-primary': active }"
    role="button"
    tabindex="0"
    :aria-pressed="active"
    :title="tooltip"
    @click="emit('open')"
    @keydown.enter="emit('open')"
  >
    <LabelPreview
      :raster="rendered.raster"
      :tape="printer.tape"
      :scale="1"
      :dark="settings.darkTape"
      compact
    />
    <p v-if="rendered.error" class="text-danger small mb-0 px-1">{{ rendered.error }}</p>
  </div>
</template>
