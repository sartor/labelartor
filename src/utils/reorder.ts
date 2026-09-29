/** List reordering for drag and drop. */

/** A copy of `list` with the item at `from` moved to index `to` of the result. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  if (from < 0 || from >= next.length) return next
  const [item] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item!)
  return next
}

/** A copy of `list` with the item whose id is `id` moved to index `to` of the result. */
export function moveById<T extends { id: string }>(
  list: readonly T[],
  id: string,
  to: number,
): T[] {
  return moveItem(
    list,
    list.findIndex((item) => item.id === id),
    to,
  )
}

/**
 * Index in the reordered list where `dragged` goes when it is held over
 * `target`: before it over the target's first half, after it over the second.
 * Deciding by half keeps tiles of different widths from swapping back and
 * forth: once moved, the pointer is still over the same half of the target.
 */
export function dropIndex(
  ids: readonly string[],
  dragged: string,
  target: string,
  after: boolean,
): number {
  const rest = ids.filter((id) => id !== dragged)
  const index = rest.indexOf(target)
  if (index === -1) return ids.indexOf(dragged)
  return index + (after ? 1 : 0)
}
