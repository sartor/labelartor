<script setup lang="ts">
/**
 * Card whose body folds away, driven by Bootstrap's Collapse plugin.
 * Follows the Bootstrap JS wrapper pattern (see AppDropdown): the plugin owns
 * the `show` class; Vue only mirrors it into the `open` model.
 */
import { IconChevronDown, IconChevronRight } from '@tabler/icons-vue'
import Collapse from 'bootstrap/js/dist/collapse'
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'

import AppIcon from '@/components/ui/AppIcon.vue'

defineProps<{ title: string }>()

const open = defineModel<boolean>('open', { default: true })
const bodyId = useId()
const bodyEl = ref<HTMLElement | null>(null)
// Read once: the plugin toggles the class from here on.
const initiallyOpen = open.value
let instance: Collapse | null = null

onMounted(() => {
  const el = bodyEl.value!
  instance = Collapse.getOrCreateInstance(el, { toggle: false })
  el.addEventListener('shown.bs.collapse', () => (open.value = true))
  el.addEventListener('hidden.bs.collapse', () => (open.value = false))
})

onBeforeUnmount(() => {
  instance?.dispose()
  instance = null
})
</script>

<template>
  <section class="card">
    <div class="card-header d-flex flex-wrap align-items-center gap-2">
      <button
        type="button"
        class="btn btn-link link-body-emphasis text-decoration-none p-0 d-inline-flex align-items-center gap-1"
        data-bs-toggle="collapse"
        :data-bs-target="`#${bodyId}`"
        :aria-expanded="open"
        :aria-controls="bodyId"
      >
        <AppIcon :icon="open ? IconChevronDown : IconChevronRight" :size="16" />
        {{ title }}
      </button>
      <span class="small text-body-secondary"><slot name="meta" /></span>
      <span class="ms-auto d-flex flex-wrap align-items-center gap-2"><slot name="actions" /></span>
    </div>
    <div :id="bodyId" ref="bodyEl" class="collapse" :class="{ show: initiallyOpen }">
      <div class="card-body">
        <slot />
      </div>
    </div>
  </section>
</template>
