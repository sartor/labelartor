<script setup lang="ts">
/** Card whose body folds away: Bootstrap's `.collapse` / `.show` classes, toggled by Vue. */
import { useId } from 'vue'

import AppIcon from '@/components/ui/AppIcon.vue'
import { IconChevronDown, IconChevronRight } from '@/icons'

defineProps<{ title: string }>()

const open = defineModel<boolean>('open', { default: true })
const bodyId = useId()
</script>

<template>
  <section class="card">
    <div class="card-header d-flex flex-wrap align-items-center gap-2">
      <button
        type="button"
        class="btn btn-link link-body-emphasis text-decoration-none p-0 d-inline-flex align-items-center gap-1"
        :aria-expanded="open"
        :aria-controls="bodyId"
        @click="open = !open"
      >
        <AppIcon :icon="open ? IconChevronDown : IconChevronRight" />
        {{ title }}
      </button>
      <span class="small text-body-secondary"><slot name="meta" /></span>
      <span class="ms-auto d-flex flex-wrap align-items-center gap-2"><slot name="actions" /></span>
    </div>
    <div :id="bodyId" class="collapse" :class="{ show: open }">
      <div class="card-body">
        <slot />
      </div>
    </div>
  </section>
</template>
