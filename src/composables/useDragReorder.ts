import { onBeforeUnmount, ref, type Ref } from 'vue'

import { dropIndex } from '@/utils/reorder'

/** Mouse and pen: a drag starts once the pointer moves this far. */
const MOVE_THRESHOLD_PX = 5
/** Touch: a drag starts after holding still this long; moving sooner scrolls the page. */
const LONG_PRESS_MS = 300

export interface DragReorderOptions {
  /** Positioned element whose descendants `[data-entry-id]` are the items. */
  container: Ref<HTMLElement | null>
  ids: () => readonly string[]
  /** Moves the item to `toIndex` of the reordered list; called live while dragging. */
  move: (id: string, toIndex: number) => void
  enabled: () => boolean
}

/**
 * Drag to reorder with Pointer Events (mouse, pen and touch). The list is
 * reordered live as the item passes over the others; the click that ends a
 * drag is swallowed so the item is not opened.
 */
export function useDragReorder({ container, ids, move, enabled }: DragReorderOptions) {
  const draggingId = ref<string | null>(null)

  let press: {
    id: string
    pointerId: number
    x: number
    y: number
    el: HTMLElement
    timer: ReturnType<typeof setTimeout> | undefined
  } | null = null
  let swallowClick = false

  const preventDefault = (event: Event) => event.preventDefault()

  function begin() {
    if (!press) return
    draggingId.value = press.id
    try {
      press.el.setPointerCapture(press.pointerId)
    } catch {
      // The pointer is already gone.
    }
    // Keep the page from scrolling under a touch drag.
    window.addEventListener('touchmove', preventDefault, { passive: false })
  }

  function end() {
    if (press?.timer) clearTimeout(press.timer)
    if (draggingId.value) {
      swallowClick = true
      setTimeout(() => (swallowClick = false))
    }
    press = null
    draggingId.value = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    window.removeEventListener('touchmove', preventDefault)
    window.removeEventListener('contextmenu', preventDefault)
  }

  /**
   * Moves the dragged item next to the item under the pointer. Positions come
   * from the layout (offsets), not the screen, so tiles still sliding into
   * place do not throw the hit test off.
   */
  function reorderAt(clientX: number, clientY: number) {
    const box = container.value
    const dragged = draggingId.value
    if (!box || !dragged) return
    const origin = box.getBoundingClientRect()
    const x = clientX - origin.left
    const y = clientY - origin.top
    for (const tile of box.querySelectorAll<HTMLElement>('[data-entry-id]')) {
      const id = tile.dataset.entryId!
      const { offsetLeft: left, offsetTop: top, offsetWidth: width, offsetHeight: height } = tile
      if (x < left || x > left + width || y < top || y > top + height) continue
      if (id === dragged) return
      const list = ids()
      const to = dropIndex(list, dragged, id, x > left + width / 2)
      if (to !== list.indexOf(dragged)) move(dragged, to)
      return
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (!press || event.pointerId !== press.pointerId) return
    if (!draggingId.value) {
      const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y)
      if (moved < MOVE_THRESHOLD_PX) return
      // A touch that moves before the long press is a scroll, not a drag.
      if (event.pointerType === 'touch') return end()
      begin()
    }
    event.preventDefault()
    reorderAt(event.clientX, event.clientY)
  }

  function onPointerDown(event: PointerEvent, id: string) {
    if (!enabled() || event.button !== 0 || press) return
    press = {
      id,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      el: event.currentTarget as HTMLElement,
      timer: event.pointerType === 'touch' ? setTimeout(begin, LONG_PRESS_MS) : undefined,
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    // A long press would open the context menu on touch screens.
    window.addEventListener('contextmenu', preventDefault)
  }

  /** Use as a capturing click handler on the container. */
  function onClickCapture(event: MouseEvent) {
    if (!swallowClick) return
    event.stopPropagation()
    event.preventDefault()
  }

  onBeforeUnmount(end)

  return { draggingId, onPointerDown, onClickCapture }
}
