/** Brings a panel of the page into view. */
export function useOpenInEditor() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return { scrollTo }
}
