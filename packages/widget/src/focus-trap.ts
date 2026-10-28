const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

function focusables(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
    .filter(element => !element.closest('[hidden]') && element.tabIndex !== -1)
}

/** Keeps Tab and Shift+Tab inside `container` (which lives in `root`). */
export function trapFocus(event: KeyboardEvent, container: HTMLElement, root: ShadowRoot) {
  if (event.key !== 'Tab') return
  const items = focusables(container)
  if (!items.length) return

  const first = items[0]!
  const last = items[items.length - 1]!
  const active = root.activeElement

  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault()
    last.focus()
  }
  else if (!event.shiftKey && (active === last || !container.contains(active))) {
    event.preventDefault()
    first.focus()
  }
}

export function focusFirst(container: HTMLElement) {
  focusables(container)[0]?.focus()
}
