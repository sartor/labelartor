<script setup lang="ts">
/** The label editor: the selected project label, changed as you type; Print prints it alone. */
import { computed } from 'vue'

import AlignButtons from '@/components/editor/AlignButtons.vue'
import BoldToggle from '@/components/editor/BoldToggle.vue'
import FontSelect from '@/components/editor/FontSelect.vue'
import FontSizeInput from '@/components/editor/FontSizeInput.vue'
import LabelTextInput from '@/components/editor/LabelTextInput.vue'
import TapeLengthInput from '@/components/editor/TapeLengthInput.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue'
import NumberField from '@/components/ui/NumberField.vue'
import { useLabelActions } from '@/composables/useLabelActions'
import { fontHasBold } from '@/core/fonts'
import { LINE_GAP, splitLines } from '@/core/label'
import { PT_P300BT } from '@/core/printer'
import { IconLineHeight, IconPrinter } from '@/icons'
import { useLabelStore } from '@/stores/label'
import { useLabelRenderStore } from '@/stores/labelRender'
import { useSettingsStore } from '@/stores/settings'

const label = useLabelStore()
const render = useLabelRenderStore()
const settings = useSettingsStore()
const { printing, blockedReason, hint, printLabel } = useLabelActions()

const isMultiline = computed(() => splitLines(label.text).length > 1)
const boldAvailable = computed(() => fontHasBold(label.fontFamily))

const leadMm = computed(() => (settings.showTapeLead ? PT_P300BT.unusedLeadMm : 0))
/** Tape the text alone needs: the least the length slider can ask for. */
const minTapeMm = computed(() => render.naturalLengthMm + leadMm.value)
const tapeUsedMm = computed(() => render.lengthMm + leadMm.value)
</script>

<template>
  <CollapsibleCard v-model:open="settings.openPanes.text" title="Text">
    <template #meta>{{ hint }}</template>
    <template #actions>
      <button
        type="button"
        class="btn btn-sm btn-outline-primary"
        :title="blockedReason ?? undefined"
        :disabled="!!blockedReason || printing"
        @click="printLabel"
      >
        <span v-if="printing" class="spinner-border spinner-border-sm me-1" aria-hidden="true" />
        <AppIcon v-else :icon="IconPrinter" class="me-1" />
        {{ printing ? 'Printing…' : 'Print one' }}
      </button>
    </template>

    <div class="row g-3">
      <div class="col-12 col-md-5 d-flex flex-column gap-2">
        <FontSelect v-model="label.fontFamily" />
        <div class="d-flex flex-wrap gap-2">
          <FontSizeInput
            v-model="label.fontSizePx"
            :max="render.layout?.maxFontSizePx ?? 0"
            class="col"
          />
          <NumberField
            v-model="label.lineGap"
            :icon="IconLineHeight"
            label="Line gap"
            :min="render.layout?.minLineGap ?? 0"
            :max="render.layout?.maxLineGap ?? 0"
            :step="LINE_GAP.step"
            title="Line gap, dots"
            :disabled="!isMultiline"
            class="col"
          />
          <BoldToggle v-model="label.bold" :disabled="!boldAvailable" />
          <AlignButtons v-model="label.align" kind="text" />
        </div>
        <div class="d-flex align-items-end gap-2">
          <TapeLengthInput
            v-model="label.lengthMm"
            :min-mm="minTapeMm"
            :includes-lead="settings.showTapeLead"
            :lead-mm="PT_P300BT.unusedLeadMm"
            :used-mm="tapeUsedMm"
            class="flex-grow-1"
          />
          <AlignButtons v-model="label.tapeAlign" kind="tape" :disabled="!label.lengthMm" />
        </div>
      </div>
      <div class="col-12 col-md-7">
        <LabelTextInput
          v-model="label.text"
          :font-family="label.fontFamily"
          :bold="label.bold && boldAvailable"
        />
      </div>
    </div>
  </CollapsibleCard>
</template>
