<script setup lang="ts">
import { computed, useId } from 'vue'

const props = defineProps<{ fontFamily?: string; bold?: boolean }>()

const model = defineModel<string>({ required: true })
const id = useId()

/** The label's typeface, at a size that shows its shapes clearly. */
const style = computed(() => ({
  fontSize: '32px',
  lineHeight: '40px',
  ...(props.fontFamily && {
    fontFamily: `'${props.fontFamily}', sans-serif`,
    fontWeight: props.bold ? 700 : 400,
  }),
}))
</script>

<template>
  <div>
    <label :for="id" class="form-label visually-hidden">Label text</label>
    <!-- The textarea previews the label font; that is content, not theme styling. -->
    <textarea
      :id="id"
      v-model="model"
      class="form-control form-control-lg"
      rows="3"
      placeholder="Type the label text. Use Enter for multiple lines."
      :style="style"
    />
  </div>
</template>
