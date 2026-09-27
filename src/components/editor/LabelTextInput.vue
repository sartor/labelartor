<script setup lang="ts">
import { useId } from 'vue'

defineProps<{ fontFamily?: string; bold?: boolean }>()

const model = defineModel<string>({ required: true })
const id = useId()
</script>

<template>
  <div class="d-flex flex-column">
    <label :for="id" class="form-label visually-hidden">Label text</label>
    <!-- The textarea previews the label font; that is content, not theme styling.
         It grows to fill whatever height the parent gives the component. -->
    <textarea
      :id="id"
      v-model="model"
      class="form-control form-control-lg flex-grow-1"
      rows="5"
      placeholder="Type the label text. Use Enter for multiple lines."
      :style="
        fontFamily
          ? { fontFamily: `'${fontFamily}', sans-serif`, fontWeight: bold ? 700 : 400 }
          : undefined
      "
    />
  </div>
</template>
