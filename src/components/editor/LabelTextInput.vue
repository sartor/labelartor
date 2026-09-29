<script setup lang="ts">
import { useId } from 'vue'

const model = defineModel<string>({ required: true })
const id = useId()

/**
 * In the page's font, like the rest of the editor. It fills the fixed height
 * the editor gives it (three lines), so it is not resizable.
 */
const STYLE = { fontSize: '18px', lineHeight: '24px', resize: 'none' as const }
</script>

<template>
  <div class="h-100">
    <label :for="id" class="form-label visually-hidden">Label text</label>
    <textarea
      :id="id"
      v-model="model"
      class="form-control form-control-lg h-100"
      rows="3"
      placeholder="Type the label text. Use Enter for multiple lines."
      :style="STYLE"
    />
  </div>
</template>
