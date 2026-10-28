# @staticdesk/widget

Embeddable contact form, comments and reactions (and soon reviews) for static sites:
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
| `page-id` | Page identifier sent with messages. Defaults to the canonical path. |
| `locale` | Language for this element. |
| `theme` | `auto` (default), `light` or `dark`. Can be changed at any time. |

Open the floating form from your own button with `StaticDesk.openContact()`.

Texts, custom fields (text, long text, choice list, checkbox), the name field
(optional, required or hidden), the redirect page and team notifications are
set per form in the dashboard.

### `<staticdesk-comments>`

```html
<staticdesk-comments></staticdesk-comments>
```

Comments of the current page, with replies (two levels) and a small Markdown
subset (**bold**, *italic*, `code`, code blocks, quotes, lists and links).
Visitors can post with a name or anonymously, edit their comment for 15
minutes and delete it at any time from the same browser. Depending on the
widget's settings, comments are published right away or wait for approval in
the dashboard.

### `<staticdesk-reactions>`

```html
<staticdesk-reactions></staticdesk-reactions>
```

"Was this page helpful?" with an optional comment after a "no", and emoji
reactions with a public counter. Votes are shown in the dashboard only.

Both elements accept `widget-id`, `locale` and `theme` like the contact form,
and `page-id` to choose the page identifier. By default it is the path of the
page's canonical URL (without `index.html` or a trailing slash), and it
follows single-page app navigation (Docusaurus, VitePress…).

### Styling

Widgets render in a Shadow DOM, so your page styles do not leak in. Customize
them with CSS variables:

```css
staticdesk-contact, staticdesk-comments, staticdesk-reactions {
  --sd-primary: #e11d48;
  --sd-radius: 6px;
  --sd-font: "Inter", sans-serif;
}
```

Available variables: `--sd-primary`, `--sd-on-primary`, `--sd-bg`, `--sd-surface`,
`--sd-fg`, `--sd-muted`, `--sd-border`, `--sd-danger`, `--sd-success`, `--sd-radius`,
`--sd-font`, `--sd-shadow`.

## Privacy

No cookies and no tracking. When a visitor posts a comment or a reaction, the
widget keeps the secret that lets them edit or remove it in `localStorage`;
nothing is stored otherwise. Visitor IP addresses are never stored: rate
limiting and deduplication use a daily, per-site hash.

## License

[MIT](LICENSE)
