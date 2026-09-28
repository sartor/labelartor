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
      <template v-if="render.raster && render.layout">
        {{ render.lengthMm.toFixed(1) }} mm label
        <template v-if="settings.showTapeLead"> · {{ tapeUsedMm.toFixed(1) }} mm used </template>
        ·
        <span title="Text height / tape height, dots">
          fill {{ render.layout.contentHeight }}/{{ printer.tape.printableDots }}
        </span>
        ·
        <span title="Share of cleanly printed dots">
          crisp {{ Math.round(render.sharpness * 100) }}%
        </span>
      </template>
    </template>
    <template #actions>
      <div class="input-group input-group-sm w-auto" role="group" title="Tape fed before the label">
        <label class="input-group-text" :for="leadId">{{ PT_P300BT.unusedLeadMm }} mm lead</label>
        <!-- Bootstrap's input-group checkbox pattern; form-switch on the addon draws the pill. -->
        <span class="input-group-text form-switch">
          <input
            :id="leadId"
            v-model="settings.showTapeLead"
            class="form-check-input mt-0 ms-0"
            type="checkbox"
            role="switch"
            :aria-label="`Show the ${PT_P300BT.unusedLeadMm} mm lead`"
          />
        </span>
      </div>
      <SegmentedControl
        v-model="settings.previewScale"
        :options="scaleOptions"
        prefix="Zoom"
        size="sm"
        aria-label="Preview scale"
      />
    </template>

    <LabelPreview
      :raster="render.raster"
      :tape="printer.tape"
      :scale="settings.previewScale"
      :show-lead="settings.showTapeLead"
      :dark="settings.darkTape"
    />
    <p v-if="render.error" class="text-danger small mb-0">{{ render.error }}</p>
  </CollapsibleCard>
</template>
