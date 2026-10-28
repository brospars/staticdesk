# @staticdesk/widget

Embeddable contact form (and soon comments, likes and reviews) for static sites:
GitHub Pages, GitLab Pages, Docusaurus, MkDocs, Jekyll, Hugo, VitePress, Astro…
Part of [StaticDesk](https://github.com/brospars/staticdesk).

## Usage

Create a site in your StaticDesk dashboard, then paste the snippet it gives you:

```html
<script src="https://staticdesk.app/widget.js" data-site="pk_your_site_key" defer></script>
<staticdesk-contact mode="floating"></staticdesk-contact>
```

To pin a version, load it from a CDN and point it to your StaticDesk server:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@staticdesk/widget@0.1/dist/widget.js"
  data-site="pk_your_site_key"
  data-api-base="https://staticdesk.app"
  defer
></script>
```

### Script attributes

| Attribute | Description |
| --- | --- |
| `data-site` | Your site's public key (required). |
| `data-api-base` | StaticDesk server URL. Defaults to the origin of the script. |
| `data-locale` | Force the language (`en`, `fr`). Defaults to the site setting, then the browser language. |

### `<staticdesk-contact>`

| Attribute | Description |
| --- | --- |
| `mode="floating"` | Floating button that opens the form in a dialog. Without it, the form renders inline. |
| `widget-id` | Use a specific contact widget of the site. |
| `locale` | Language for this element. |
| `theme` | `auto` (default), `light` or `dark`. |

Open the floating form from your own button with `StaticDesk.openContact()`.

Texts, custom fields (text, long text, choice list, checkbox), the name field
(optional, required or hidden), the redirect page and team notifications are
set per form in the dashboard.

### Styling

Widgets render in a Shadow DOM, so your page styles do not leak in. Customize
them with CSS variables:

```css
staticdesk-contact {
  --sd-primary: #e11d48;
  --sd-radius: 6px;
  --sd-font: "Inter", sans-serif;
}
```

Available variables: `--sd-primary`, `--sd-on-primary`, `--sd-bg`, `--sd-surface`,
`--sd-fg`, `--sd-muted`, `--sd-border`, `--sd-danger`, `--sd-success`, `--sd-radius`,
`--sd-font`, `--sd-shadow`.

## Privacy

No cookies and no local storage. Visitor IP addresses are never stored: rate
limiting uses a daily, per-site hash.

## License

AGPL-3.0
