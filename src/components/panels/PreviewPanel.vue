<script setup lang="ts">
/** The label as it will print, with the numbers that tell how well it fits the tape. */
import { computed, useId } from 'vue'

import LabelPreview from '@/components/editor/LabelPreview.vue'
import SegmentedControl, { type SegmentedOption } from '@/components/ui/SegmentedControl.vue'
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue'
import { PT_P300BT } from '@/core/printer'
import { useLabelRenderStore } from '@/stores/labelRender'
import { usePrinterStore } from '@/stores/printer'
import { useSettingsStore, type PreviewScale } from '@/stores/settings'

const render = useLabelRenderStore()
const printer = usePrinterStore()
const settings = useSettingsStore()
const leadId = useId()

const scaleOptions: SegmentedOption<PreviewScale>[] = [
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 3, label: '3×' },
]

const tapeUsedMm = computed(
  () => render.lengthMm + (settings.showTapeLead ? PT_P300BT.unusedLeadMm : 0),
)
</script>

<template>
  <CollapsibleCard v-model:open="settings.openPanes.preview" title="Preview">
    <template #meta>
      {{ printer.tape.widthMm }} mm tape
      <template v-if="render.raster && render.layout">
        · {{ render.lengthMm.toFixed(1) }} mm label
        <template v-if="settings.showTapeLead"> · {{ tapeUsedMm.toFixed(1) }} mm used </template>
        ·
        <span
          title="CSS font size (the em box) in printer dots, 1 dot = 0.141 mm. The letters themselves are fitted to the tape, so fonts whose letters are small within their em (small caps, low x-height) get a large size; see fill for the ink height."
        >
          font {{ render.layout.fontSizePx }} px
        </span>
        ·
        <span title="Dots the text block spans / printable dots across the tape">
          fill {{ render.layout.contentHeight }}/{{ printer.tape.printableDots }}
        </span>
        ·
        <span
          title="Share of dots the glyph outlines cover fully or not at all. Partly covered dots depend on the threshold and the browser; a pixel font at a multiple of its grid scores 100%."
        >
          crisp {{ Math.round(render.sharpness * 100) }}%
        </span>
      </template>
    </template>
    <template #actions>
      <div class="form-check form-switch mb-0">
        <input
          :id="leadId"
          v-model="settings.showTapeLead"
          class="form-check-input"
          type="checkbox"
          role="switch"
        />
        <label class="form-check-label small" :for="leadId">
          Show {{ PT_P300BT.unusedLeadMm }} mm lead
        </label>
      </div>
      <SegmentedControl
        v-model="settings.previewScale"
        :options="scaleOptions"
        size="sm"
        aria-label="Preview scale"
      />
    </template>

    <LabelPreview
      :raster="render.raster"
      :tape="printer.tape"
      :scale="settings.previewScale"
      :show-lead="settings.showTapeLead"
    />
    <p v-if="render.error" class="text-danger small mb-0">{{ render.error }}</p>
  </CollapsibleCard>
</template>
