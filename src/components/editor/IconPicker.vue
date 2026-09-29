<script setup lang="ts">
/**
 * Choose the icon and height of an icon block; every pick applies at once.
 * The User category lists pasted icons, and ends with a button that pastes
 * another from the clipboard.
 */
import { computed, onBeforeUnmount, ref } from 'vue'

import LabelIconImage from '@/components/editor/LabelIconImage.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import SegmentedControl, { type SegmentedOption } from '@/components/ui/SegmentedControl.vue'
import {
  ICON_CATEGORIES,
  ICON_SIZES,
  LABEL_ICONS,
  findLabelIcon,
  iconFromPixels,
  isUserIconId,
  type IconSize,
  type LabelIcon,
} from '@/core/label'
import { IconTrash } from '@/icons'
import { useSettingsStore, type IconFilter } from '@/stores/settings'
import { useUserIconsStore } from '@/stores/userIcons'
import { pastedPicture, readClipboardPicture, type Pixels } from '@/utils/clipboardPicture'

const icon = defineModel<string>('icon', { required: true })
const size = defineModel<IconSize>('size', { required: true })

defineProps<{
  /** Height the icon prints at on the loaded tape; the grid shows every icon at it. */
  printHeight: number
}>()

const settings = useSettingsStore()
const userIcons = useUserIconsStore()

const filterOptions: SegmentedOption<IconFilter>[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'all', label: 'All' },
  // Categories without icons yet are left out; User always shows, to paste into.
  ...ICON_CATEGORIES.filter(
    (c) => c.id === 'user' || LABEL_ICONS.some((i) => i.categories.includes(c.id)),
  ).map((c) => ({ value: c.id, label: c.name })),
]
const sizeOptions: SegmentedOption<IconSize>[] = ICON_SIZES.map((s) => ({
  value: s,
  label: String(s),
}))

const name = computed(() => findLabelIcon(icon.value)?.name ?? '')

/** The pasted icons, oldest first. */
const pasted = computed(() =>
  userIcons.items.map((i) => findLabelIcon(i.id)).filter((i): i is LabelIcon => !!i),
)
const byName = computed(() =>
  [...LABEL_ICONS, ...pasted.value].sort((a, b) => a.name.localeCompare(b.name)),
)

/** Recent: the icons used so far, latest first. User: in the order pasted. Otherwise by name. */
const listed = computed(() => {
  const filter = settings.iconFilter
  if (filter === 'recent') {
    const used = settings.iconLastUsed
    return byName.value.filter((i) => used[i.id]).sort((a, b) => used[b.id]! - used[a.id]!)
  }
  if (filter === 'all') return byName.value
  if (filter === 'user') return pasted.value
  return byName.value.filter((i) => i.categories.includes(filter))
})

const canDelete = computed(() => settings.iconFilter === 'user' && isUserIconId(icon.value))

/** The paste panel is open: waiting for Ctrl+V (or the clipboard, when it can be read). */
const waiting = ref(false)
const pasteKeys = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘ Cmd + V' : 'Ctrl + V'

function addPicture(pixels: Pixels | null) {
  if (!pixels) {
    window.alert(
      'The clipboard holds no picture. Copy a PNG, JPEG or SVG image, SVG code, ' +
        'or a data:image link first.',
    )
    return
  }
  const bitmap = iconFromPixels(pixels.data, pixels.width, pixels.height)
  if (!bitmap) {
    window.alert('The picture is blank: there is no icon in it.')
    return
  }
  const fallback = userIcons.defaultName()
  const given = window.prompt('Name of the new icon', fallback)
  if (given === null) return
  icon.value = userIcons.add(given.trim() || fallback, bitmap)
}

/**
 * Opens the paste panel. A picture already on the clipboard is taken at
 * once when the browser lets the page read it; otherwise the panel waits
 * for Ctrl+V.
 */
async function paste() {
  if (waiting.value) return stopWaiting()
  waiting.value = true
  window.addEventListener('paste', onPaste)
  window.addEventListener('keydown', onKey)
  let pixels: Pixels | null = null
  try {
    pixels = await readClipboardPicture()
  } catch {
    // No access (or no API): wait for Ctrl+V.
  }
  if (pixels && waiting.value) {
    stopWaiting()
    addPicture(pixels)
  }
}

async function onPaste(event: ClipboardEvent) {
  event.preventDefault()
  const pixels = event.clipboardData ? await pastedPicture(event.clipboardData) : null
  // Nothing usable: say so and keep waiting for another paste.
  if (pixels) stopWaiting()
  addPicture(pixels)
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') stopWaiting()
}

function stopWaiting() {
  waiting.value = false
  window.removeEventListener('paste', onPaste)
  window.removeEventListener('keydown', onKey)
}

onBeforeUnmount(stopWaiting)

function remove() {
  const id = icon.value
  if (!window.confirm(`Delete the icon “${name.value}”? Labels that use it lose it.`)) return
  const list = pasted.value
  const at = list.findIndex((i) => i.id === id)
  // Select a neighbour, so the block keeps an icon.
  const next = list[at + 1] ?? list[at - 1] ?? LABEL_ICONS[0]!
  icon.value = next.id
  userIcons.remove(id)
}
</script>

<template>
  <div class="d-flex flex-column gap-2">
    <div class="d-flex flex-wrap gap-2">
      <SegmentedControl
        v-model="settings.iconFilter"
        :options="filterOptions"
        size="sm"
        aria-label="Icon category"
      />
      <span class="d-inline-block" title="Height, dots">
        <SegmentedControl
          v-model="size"
          :options="sizeOptions"
          prefix="Height"
          size="sm"
          aria-label="Icon height"
        />
      </span>
      <span class="align-self-center text-body-secondary">{{ name }}</span>
      <button
        v-if="canDelete"
        type="button"
        class="btn btn-sm btn-outline-danger"
        title="Delete this icon"
        @click="remove"
      >
        <AppIcon :icon="IconTrash" class="me-1" />Delete
      </button>
    </div>
    <!-- At the print height, one screen pixel per dot: exactly what each icon would print. -->
    <p v-if="!listed.length && settings.iconFilter !== 'user'" class="text-body-secondary mb-0">
      Icons you pick are listed here. Choose one from All or a category.
    </p>
    <div v-else class="d-flex flex-wrap gap-1" role="listbox" aria-label="Icons">
      <button
        v-for="item in listed"
        :key="item.id"
        type="button"
        role="option"
        class="btn btn-outline-secondary p-1 lh-1"
        :class="{ active: item.id === icon }"
        :aria-selected="item.id === icon"
        :title="item.name"
        @click="icon = item.id"
      >
        <LabelIconImage :icon="item.id" :size="printHeight" class="d-block" />
      </button>
      <button
        v-if="settings.iconFilter === 'user'"
        type="button"
        class="btn btn-success p-1 lh-1"
        :class="{ active: waiting }"
        :title="waiting ? 'Cancel pasting' : 'Paste an icon: PNG, JPEG or SVG'"
        @click="paste"
      >
        <svg
          :width="printHeight"
          :height="printHeight"
          viewBox="0 0 16 16"
          fill="currentColor"
          class="d-block"
          aria-hidden="true"
        >
          <path d="M7 3h2v4h4v2H9v4H7V9H3V7h4z" />
        </svg>
        <span class="visually-hidden">Paste an icon</span>
      </button>
    </div>
    <div v-if="waiting" class="alert alert-success mb-0" role="status">
      <p class="fs-5 mb-2">
        Press <kbd>{{ pasteKeys }}</kbd> to paste your icon.
      </p>
      <p class="mb-1">You can paste:</p>
      <ul class="mb-2">
        <li>
          <b>PNG</b> or <b>JPEG</b> picture: an image copied from a page or an app, or an image file
        </li>
        <li><b>SVG</b> file, or SVG code copied as text</li>
        <li>A <code>data:image/…</code> link, or base64 text of a PNG or JPEG</li>
      </ul>
      <p class="mb-2">
        Looking for an icon? Find one on
        <a href="https://icones.js.org/collection/all" target="_blank" rel="noopener">Icônes</a>,
        open it, press <b>SVG</b> under <i>Snippets</i> to copy its code, then come back here and
        press <kbd>{{ pasteKeys }}</kbd
        >.
      </p>
      <p class="small mb-2">
        The picture is trimmed to its content and turned into 64-dot black-and-white dots. A dark
        shape on a light or transparent background works best; light on dark is inverted.
      </p>
      <button type="button" class="btn btn-sm btn-outline-secondary" @click="stopWaiting">
        Cancel <span class="text-body-secondary">(Esc)</span>
      </button>
    </div>
  </div>
</template>
