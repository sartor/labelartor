<script setup lang="ts">
/**
 * Dropdown on the stylesheet alone: Vue toggles the `show` classes and closes
 * the menu on an outside click or Escape. `data-bs-popper="static"` selects
 * Halfmoon's own positioning rules (below the toggle, aligned to its start
 * or end), the same attribute Bootstrap sets when it skips Popper.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    align?: 'start' | 'end'
    toggleClass?: string
    title?: string
    /** Like Bootstrap's `autoClose`: `outside` keeps the menu open on clicks inside it. */
    autoClose?: boolean | 'inside' | 'outside'
  }>(),
  { align: 'start', toggleClass: 'btn btn-secondary', title: undefined, autoClose: true },
)

const open = ref(false)
const toggleEl = ref<HTMLButtonElement | null>(null)
const menuEl = ref<HTMLElement | null>(null)

function onDocumentClick(event: MouseEvent) {
  if (!open.value) return
  const target = event.target as Node
  if (toggleEl.value?.contains(target)) return
  const inside = menuEl.value?.contains(target) ?? false
  const closes = inside
    ? props.autoClose === true || props.autoClose === 'inside'
    : props.autoClose === true || props.autoClose === 'outside'
  if (closes) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !open.value) return
  open.value = false
  toggleEl.value?.focus()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="dropdown">
    <button
      ref="toggleEl"
      type="button"
      :class="[props.toggleClass, { show: open }]"
      :title="props.title"
      :aria-expanded="open"
      @click="open = !open"
    >
      <slot name="toggle" />
    </button>
    <ul
      ref="menuEl"
      class="dropdown-menu"
      :class="{ show: open, 'dropdown-menu-end': props.align === 'end' }"
      data-bs-popper="static"
    >
      <slot />
    </ul>
  </div>
</template>
