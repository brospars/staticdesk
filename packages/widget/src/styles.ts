/** Design tokens and base styles shared by every widget. Override the --sd-* variables from the page. */
export const baseStyles = `
:host {
  --sd-primary: #4f46e5;
  --sd-on-primary: #ffffff;
  --sd-bg: #ffffff;
  --sd-surface: #f8fafc;
  --sd-fg: #0f172a;
  --sd-muted: #475569;
  --sd-border: #cbd5e1;
  --sd-danger: #b91c1c;
  --sd-success: #15803d;
  --sd-radius: 12px;
  --sd-font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --sd-shadow: 0 20px 50px rgb(15 23 42 / 0.25);
  display: block;
  color: var(--sd-fg);
  font: 15px/1.5 var(--sd-font);
}
:host([hidden]) { display: none; }
:host([data-mode="dark"]) {
  --sd-bg: #0f172a; --sd-surface: #1e293b; --sd-fg: #f1f5f9; --sd-muted: #cbd5e1;
  --sd-border: #475569; --sd-danger: #fca5a5; --sd-success: #86efac;
}
@media (prefers-color-scheme: dark) {
  :host(:not([data-mode="light"])) {
    --sd-bg: #0f172a; --sd-surface: #1e293b; --sd-fg: #f1f5f9; --sd-muted: #cbd5e1;
    --sd-border: #475569; --sd-danger: #fca5a5; --sd-success: #86efac;
  }
}
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
button, input, select, textarea { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--sd-primary); outline-offset: 2px; }
.sd-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 44px; padding: 0 18px; border: 0; border-radius: var(--sd-radius);
  background: var(--sd-primary); color: var(--sd-on-primary); font-weight: 600; cursor: pointer;
}
.sd-button:disabled { opacity: 0.7; cursor: progress; }
.sd-button-ghost { background: transparent; color: var(--sd-fg); border: 1px solid var(--sd-border); }
.sd-field { display: grid; gap: 6px; margin: 0 0 14px; }
.sd-label { font-weight: 600; font-size: 14px; }
.sd-hint { color: var(--sd-muted); font-weight: 400; }
.sd-input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--sd-border); border-radius: calc(var(--sd-radius) - 4px);
  background: var(--sd-bg);
}
textarea.sd-input { min-height: 120px; resize: vertical; }
.sd-status { min-height: 1.5em; margin: 10px 0 0; color: var(--sd-danger); font-size: 14px; }
.sd-visually-hidden {
  position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
`

/** Picks black or white text for a background color (WCAG relative luminance). */
export function contrastColor(hex: string): string {
  const channels = [1, 3, 5].map((index) => {
    const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
  return luminance > 0.179 ? '#000000' : '#ffffff'
}

/** Theme rules from the site settings, placed before page overrides in the cascade. */
export function themeStyles(primaryColor: string | null): string {
  if (!primaryColor || !/^#[0-9a-f]{6}$/i.test(primaryColor)) return ''
  return `:host { --sd-primary: ${primaryColor}; --sd-on-primary: ${contrastColor(primaryColor)}; }`
}
