type Attributes = Record<string, string | boolean | undefined>
type Child = Node | string | null | undefined | false

/** Minimal element factory. Text is always set as text, never parsed as HTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  for (const [name, value] of Object.entries(attributes)) {
    if (value === true) element.setAttribute(name, '')
    else if (value !== false && value !== undefined) element.setAttribute(name, value)
  }
  for (const child of children) {
    if (child) element.append(child)
  }
  return element
}

let counter = 0
/** Unique id for ARIA references inside a shadow root. */
export function uid(prefix: string) {
  counter += 1
  return `sd-${prefix}-${counter}`
}
