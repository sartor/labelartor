<script setup lang="ts">
/**
 * Shows the label as it will print, at physical size (CSS millimetres):
 * pixels are rebuilt from the printer raster and drawn on a tape-sized strip.
 */
import { computed, ref, watchPostEffect } from 'vue'

import { rasterToPixels } from '@/core/label'
import { PT_P300BT, dotsToMm, type RasterImage, type TapeSpec } from '@/core/printer'

const props = withDefaults(
  defineProps<{
    raster: RasterImage | null
    tape: TapeSpec
    /** 1 = actual size. */
    scale?: number
    /** Show the tape the printer feeds before the label (not printable). */
    showLead?: boolean
    /** No padding around the strip and a terse placeholder (for lists of labels). */
    compact?: boolean
    /** White text on black tape (a white-on-black cartridge) instead of black on white. */
    dark?: boolean
  }>(),
  { scale: 1, showLead: false, compact: false, dark: false },
)

type Rgb = [number, number, number]
const BLACK: Rgb = [17, 17, 17]
const WHITE: Rgb = [255, 255, 255]

const canvas = ref<HTMLCanvasElement | null>(null)

const colors = computed(() =>
  props.dark ? { ink: WHITE, tape: BLACK } : { ink: BLACK, tape: WHITE },
)
const tapeBg = computed(() => (props.dark ? 'bg-black' : 'bg-white'))

const mm = (value: number) => `${(value * props.scale).toFixed(3)}mm`
const printableMm = computed(() => dotsToMm(props.tape.printableDots))
const edgeMm = computed(() => Math.max(0, (props.tape.widthMm - printableMm.value) / 2))

/**
 * Hard pixel edges only look right when each dot covers at least two device
 * pixels; below that, smooth scaling reads better than uneven blocks.
 */
const pixelated = computed(() => {
  const cssPxPerDot = (96 / PT_P300BT.dpi) * props.scale
  return cssPxPerDot * window.devicePixelRatio >= 2
})

watchPostEffect(() => {
  const el = canvas.value
  const raster = props.raster
  if (!el || !raster) return
  const pixels = rasterToPixels(raster, props.tape.printableDots, colors.value)
  el.width = pixels.width
  el.height = pixels.height
  el.getContext('2d')?.putImageData(new ImageData(pixels.data, pixels.width, pixels.height), 0, 0)
})
</script>

<template>
  <div class="overflow-x-auto" :class="{ 'py-2 px-1': !compact }">
    <div
      v-if="raster"
      class="d-inline-flex align-top"
      :class="[tapeBg, { 'border shadow-sm': !compact }]"
      :style="{ height: mm(tape.widthMm) }"
    >
      <div
        v-if="showLead"
        class="tape-lead d-flex flex-shrink-0 align-items-center justify-content-center overflow-hidden"
        :class="{ dark }"
        :style="{ width: mm(PT_P300BT.unusedLeadMm) }"
        :title="`${PT_P300BT.unusedLeadMm} mm lead`"
      >
        <span class="small text-secondary px-1 text-nowrap" :class="tapeBg">
          {{ PT_P300BT.unusedLeadMm }} mm
        </span>
      </div>
      <div class="flex-shrink-0" :style="{ paddingBlock: mm(edgeMm) }">
        <canvas
          ref="canvas"
          class="d-block"
          :class="{ pixelated, dark, 'print-area': !compact }"
          :style="{ width: mm(dotsToMm(raster.lines)), height: mm(printableMm) }"
        />
      </div>
    </div>
    <p v-else-if="compact" class="small text-body-secondary mb-0 px-2">empty label</p>
    <p v-else class="text-body-secondary mb-0 py-3 text-center">
      Type some text to see the label preview.
    </p>
  </div>
</template>

<!--
  Tape drawing specifics only (no Bootstrap overrides): the tape keeps its own
  colours whatever the theme, so these are fixed on purpose.
-->
<style scoped>
.tape-lead {
  background: repeating-linear-gradient(-45deg, #fff 0 3px, #e9ecef 3px 6px);
  border-right: 1px dashed #adb5bd;
}

.tape-lead.dark {
  background: repeating-linear-gradient(-45deg, #111 0 3px, #343a40 3px 6px);
  border-right-color: #6c757d;
}

/* Dashed print-area outline: editor preview only. */
.print-area {
  outline: 1px dashed rgb(0 0 0 / 0.12);
}

.print-area.dark {
  outline-color: rgb(255 255 255 / 0.25);
}

.pixelated {
  image-rendering: pixelated;
}
</style>
