<script setup lang="ts">
/** The label editor: text and typography controls, with print/queue actions in the header. */
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
import {
  IconArrowBackUp,
  IconDeviceFloppy,
  IconLineHeight,
  IconPlaylistAdd,
  IconPrinter,
} from '@/icons'
import { useLabelStore } from '@/stores/label'
import { useLabelRenderStore } from '@/stores/labelRender'
import { useSettingsStore } from '@/stores/settings'

const label = useLabelStore()
const render = useLabelRenderStore()
const settings = useSettingsStore()
const {
  printing,
  blockedReason,
  editingFrom,
  hint,
  canQueue,
  printLabel,
  addToQueue,
  saveAndReturn,
  cancelEditing,
} = useLabelActions()

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
      <div class="input-group input-group-sm w-auto" role="group" aria-label="Label actions">
        <button
          type="button"
          class="btn btn-outline-primary"
          :title="blockedReason ?? 'Print this label'"
          :disabled="!!blockedReason || printing"
          @click="printLabel"
        >
          <span v-if="printing" class="spinner-border spinner-border-sm me-1" aria-hidden="true" />
          <AppIcon v-else :icon="IconPrinter" class="me-1" />
          {{ printing ? 'Printing…' : 'Print' }}
        </button>
        <span class="input-group-text">or</span>
        <button
          type="button"
          class="btn btn-outline-primary"
          :disabled="!canQueue"
          title="Add this label to the print queue as a new entry"
          @click="addToQueue"
        >
          <AppIcon :icon="IconPlaylistAdd" class="me-1" />Add to queue
        </button>
        <template v-if="editingFrom">
          <button
            v-if="label.editing?.source === 'queue'"
            type="button"
            class="btn btn-outline-primary"
            title="Save the changes into the queued label and go back to the queue"
            @click="saveAndReturn"
          >
            <AppIcon :icon="IconDeviceFloppy" class="me-1" />Save and return to queue
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            title="Stop editing this label"
            @click="cancelEditing"
          >
            <AppIcon :icon="IconArrowBackUp" class="me-1" />Cancel
          </button>
        </template>
      </div>
    </template>

    <div class="row g-3">
      <div class="col-12 col-md-5 d-flex flex-column gap-2">
        <FontSelect v-model="label.fontFamily" />
        <div class="d-flex flex-wrap gap-2">
          <FontSizeInput
            v-model="label.fontSizePx"
            :max="render.layout?.maxFontSizePx ?? 0"
            class="w-auto flex-grow-1"
          />
          <NumberField
            v-model="label.lineGap"
            :icon="IconLineHeight"
            label="Line gap"
            :min="render.layout?.minLineGap ?? 0"
            :max="render.layout?.maxLineGap ?? 0"
            :step="LINE_GAP.step"
            title="Space between the lines in dots. Negative values let the lines overlap; with a chosen font size it stops where the lines would no longer fit."
            :disabled="!isMultiline"
            class="w-auto flex-grow-1"
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
          class="h-100"
        />
      </div>
    </div>
  </CollapsibleCard>
</template>
