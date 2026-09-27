<script setup lang="ts">
/**
 * Total tape length. The slider starts at what the text alone needs; that
 * position is stored as 0 ("auto") so the label keeps following the text.
 */
import { computed, useId } from 'vue'

import { TAPE_LENGTH } from '@/core/label'

const props = defineProps<{
  /** Tape the text alone needs, with the lead when it is counted. */
  minMm: number
  /** The length includes the blank lead the printer feeds first. */
  includesLead?: boolean
  leadMm?: number
  /** Tape the label actually takes, to flag a target the text has outgrown. */
  usedMm?: number
}>()

const model = defineModel<number>({ required: true })
const id = useId()

const min = computed(() => Math.ceil(props.minMm))
const max = computed(() => Math.max(TAPE_LENGTH.max, min.value))
/** Slider position; auto (and a target the text has outgrown) sit at the minimum. */
const position = computed(() => Math.max(min.value, model.value))

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).valueAsNumber
  model.value = value > min.value ? value : 0
}

// The raster is whole dots (~0.14 mm), so allow one dot of overshoot.
const tooShort = computed(
  () => model.value > 0 && props.usedMm !== undefined && props.usedMm > model.value + 0.2,
)

const hint = computed(() => {
  const lead = props.includesLead ? ` incl. ${props.leadMm} mm lead` : ''
  if (!model.value) {
    return props.usedMm === undefined ? 'auto' : `auto · ${props.usedMm.toFixed(1)} mm${lead}`
  }
  if (tooShort.value) return `${model.value} mm · text needs ${props.usedMm!.toFixed(1)} mm`
  return `${model.value} mm${lead}`
})
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-baseline">
      <label :for="id" class="form-label mb-0">Total tape length</label>
      <span class="small" :class="tooShort ? 'text-warning-emphasis' : 'text-body-secondary'">
        {{ hint }}
      </span>
    </div>
    <!-- min/max before value: the browser clamps a range's value against the
         limits it has at that moment, and Vue applies attributes in this order. -->
    <input
      :id="id"
      type="range"
      class="form-range"
      :min="min"
      :max="max"
      :step="TAPE_LENGTH.step"
      :value="position"
      @input="onInput"
    />
  </div>
</template>
