import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

/**
 * Follows `source`, but only turns true once it has stayed true for `delayMs`.
 * Avoids flashing "busy" indicators for operations that finish quickly.
 */
export function useDelayedFlag(source: MaybeRefOrGetter<boolean>, delayMs = 150) {
  const flag = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(
    () => toValue(source),
    (active) => {
      clearTimeout(timer)
      if (!active) flag.value = false
      else timer = setTimeout(() => (flag.value = true), delayMs)
    },
    { immediate: true },
  )
  onScopeDispose(() => clearTimeout(timer))

  return flag
}
