<script setup lang="ts">
/**
 * Vue wrapper around Bootstrap's Dropdown plugin (keyboard navigation,
 * auto-close and Popper positioning come from Bootstrap).
 *
 * Pattern for all Bootstrap JS wrappers: create the instance on mount,
 * dispose it before unmount, and never bind classes Bootstrap toggles
 * (e.g. `show`) from Vue.
 */
import Dropdown from 'bootstrap/js/dist/dropdown'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    align?: 'start' | 'end'
    toggleClass?: string
    title?: string
    /** Bootstrap `autoClose`: `outside` keeps the menu open on clicks inside it. */
    autoClose?: boolean | 'inside' | 'outside'
  }>(),
  { align: 'start', toggleClass: 'btn btn-secondary', title: undefined, autoClose: true },
)

const toggleEl = ref<HTMLButtonElement | null>(null)
const menuEl = ref<HTMLElement | null>(null)
let instance: Dropdown | null = null

onMounted(() => {
  instance = Dropdown.getOrCreateInstance(toggleEl.value!, { autoClose: props.autoClose })
})

// Vue rewrites the whole class attribute when `toggleClass` changes (e.g. a
// status colour), dropping the `show` class Bootstrap set on an open toggle.
watch(
  () => props.toggleClass,
  () => toggleEl.value?.classList.toggle('show', !!menuEl.value?.classList.contains('show')),
  { flush: 'post' },
)

onBeforeUnmount(() => {
  instance?.dispose()
  instance = null
})
</script>

<template>
  <div class="dropdown">
    <button
      ref="toggleEl"
      type="button"
      :class="props.toggleClass"
      :title="props.title"
      data-bs-toggle="dropdown"
      aria-expanded="false"
    >
      <slot name="toggle" />
    </button>
    <ul ref="menuEl" class="dropdown-menu" :class="{ 'dropdown-menu-end': props.align === 'end' }">
      <slot />
    </ul>
  </div>
</template>
