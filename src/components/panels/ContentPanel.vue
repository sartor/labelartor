<script setup lang="ts">
/**
 * The label editor: the blocks of the selected project label, changed as you
 * type. A text block shows its style and text; an icon block shows the icon
 * picker and the icon as it prints; a space block shows its length. Print
 * one prints this label alone.
 */
import { computed, nextTick } from 'vue'

import AddBlockButtons from '@/components/editor/AddBlockButtons.vue'
import AlignButtons from '@/components/editor/AlignButtons.vue'
import BlockBar from '@/components/editor/BlockBar.vue'
import BoldToggle from '@/components/editor/BoldToggle.vue'
import FontSelect from '@/components/editor/FontSelect.vue'
import FontSizeInput from '@/components/editor/FontSizeInput.vue'
import IconPicker from '@/components/editor/IconPicker.vue'
import LabelIconImage from '@/components/editor/LabelIconImage.vue'
import LabelTextInput from '@/components/editor/LabelTextInput.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue'
import NumberField from '@/components/ui/NumberField.vue'
import { useLabelActions } from '@/composables/useLabelActions'
import { fontHasBold } from '@/core/fonts'
import {
  LINE_GAP,
  SPACE_LENGTH,
  findLabelIcon,
  fittedIconSize,
  splitLines,
  type BlockKind,
  type TextLayout,
} from '@/core/label'
import { IconLineHeight, IconPrinter, IconSpace, IconTrash } from '@/icons'
import { useLabelStore } from '@/stores/label'
import { useLabelRenderStore } from '@/stores/labelRender'
import { usePrinterStore } from '@/stores/printer'
import { useSettingsStore } from '@/stores/settings'

const label = useLabelStore()
const render = useLabelRenderStore()
const printer = usePrinterStore()
const settings = useSettingsStore()
const { printing, blockedReason, note, printLabel } = useLabelActions()

const text = computed(() => label.textBlock)
const icon = computed(() => label.iconBlock)
const space = computed(() => label.spaceBlock)

/** Layout of the selected text block: its size limits and line-gap range. */
const textLayout = computed<TextLayout | null>(() => {
  const placed = render.layout?.blocks.find((b) => b.id === label.block.id)
  return placed?.kind === 'text' ? placed.layout : null
})

const isMultiline = computed(() => !!text.value && splitLines(text.value.text).length > 1)
const boldAvailable = computed(() => !!text.value && fontHasBold(text.value.fontFamily))

/** Height the icon prints at on the loaded tape. */
const iconHeight = computed(() =>
  icon.value ? fittedIconSize(icon.value.size, printer.tape.printableDots) : 0,
)
const iconName = computed(() => (icon.value ? (findLabelIcon(icon.value.icon)?.name ?? '') : ''))

/** Adds a block after the selected one; a new text block gets the cursor. */
async function addBlock(kind: BlockKind) {
  label.insertBlock(kind)
  if (kind !== 'text') return
  await nextTick()
  document.querySelector<HTMLTextAreaElement>('#content textarea')?.focus()
}
</script>

<template>
  <CollapsibleCard v-model:open="settings.openPanes.content" title="Content">
    <template #meta>{{ note }}</template>
    <template #actions>
      <button
        type="button"
        class="btn btn-sm btn-outline-primary"
        :title="blockedReason ?? 'Print this label alone'"
        :disabled="!!blockedReason"
        @click="printLabel"
      >
        <span v-if="printing" class="spinner-border spinner-border-sm me-1" aria-hidden="true" />
        <AppIcon v-else :icon="IconPrinter" class="me-1" />
        {{ printing ? 'Printing…' : 'Print one' }}
      </button>
    </template>

    <div class="row g-3">
      <!-- A third to two thirds of the row: wider when the block bar needs it, the settings taking
           the rest. Past two thirds the block bar wraps. -->
      <div
        class="col-12 col-md-auto d-flex flex-column gap-2"
        :style="{ minWidth: '33.3333%', maxWidth: '66.6667%' }"
      >
        <BlockBar
          class="align-self-start"
          :blocks="label.doc.blocks"
          :selected-id="label.block.id"
          @select="label.selectBlock"
          @move="label.moveBlock"
        />
        <!-- One fixed height for text, icon and space alike: three text lines, which also
             fits a 64-dot icon. -->
        <div :style="{ height: '84px' }">
          <LabelTextInput v-if="text" v-model="text.text" />
          <div
            v-else-if="icon"
            class="border rounded d-flex align-items-center justify-content-center p-2 h-100"
            :title="iconName"
          >
            <LabelIconImage :icon="icon.icon" :size="iconHeight" />
          </div>
          <div
            v-else-if="space"
            class="border rounded d-flex align-items-center justify-content-center p-2 h-100 small text-body-secondary"
          >
            {{ space.lengthMm }} mm of blank tape
          </div>
        </div>
      </div>
      <div class="col-12 col-md d-flex flex-column gap-2">
        <div class="d-flex flex-wrap gap-2">
          <AddBlockButtons @add="addBlock" />
          <button
            type="button"
            class="btn btn-sm btn-outline-danger"
            :title="
              label.doc.blocks.length < 2
                ? 'A label needs at least one block.'
                : 'Delete the selected block'
            "
            :disabled="label.doc.blocks.length < 2"
            @click="label.deleteBlock(label.block.id)"
          >
            <AppIcon :icon="IconTrash" class="me-1" />Delete block
          </button>
        </div>
        <template v-if="text">
          <FontSelect v-model="text.fontFamily" />
          <div class="d-flex flex-wrap gap-2">
            <FontSizeInput
              v-model="text.fontSizePx"
              :max="textLayout?.maxFontSizePx ?? 0"
              class="col"
            />
            <NumberField
              v-model="text.lineGap"
              :icon="IconLineHeight"
              label="Line gap"
              :min="textLayout?.minLineGap ?? 0"
              :max="textLayout?.maxLineGap ?? 0"
              :step="LINE_GAP.step"
              :title="
                isMultiline ? 'Line gap, dots' : 'Line gap: only for text of two or more lines.'
              "
              :disabled="!isMultiline"
              class="col"
            />
            <BoldToggle v-model="text.bold" :disabled="!boldAvailable" />
            <AlignButtons v-model="text.align" />
          </div>
        </template>
        <IconPicker
          v-else-if="icon"
          :icon="icon.icon"
          :size="icon.size"
          :print-height="iconHeight"
          @update:icon="label.setIcon"
          @update:size="label.setIconSize"
        />
        <NumberField
          v-else-if="space"
          v-model="space.lengthMm"
          :icon="IconSpace"
          label="Space length"
          :min="SPACE_LENGTH.min"
          :max="SPACE_LENGTH.max"
          :step="SPACE_LENGTH.step"
          :slider-step="SPACE_LENGTH.sliderStep"
          unit="mm"
          title="Length, mm"
        />
      </div>
    </div>
  </CollapsibleCard>
</template>
