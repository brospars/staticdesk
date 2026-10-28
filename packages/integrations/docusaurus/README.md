# @staticdesk/docusaurus-plugin

Adds [StaticDesk](https://github.com/brospars/staticdesk) to a Docusaurus 3 site:
a floating contact button on every page, and contact form, comments and "Was this
page helpful?" components for your pages. Messages land in your StaticDesk shared
inbox.

## Install

```sh
npm install @staticdesk/docusaurus-plugin
```

Create a site in the StaticDesk dashboard and add your docs domain to its allowed
origins (`http://localhost` is accepted while "Allow localhost" is on). Then, in
`docusaurus.config.js`:

```js
export default {
  // ...
  plugins: [
    ['@staticdesk/docusaurus-plugin', { siteKey: 'pk_your_site_key' }],
  ],
}
```

The floating "Contact us" button now shows on every page. The widget follows the
Docusaurus light and dark modes, and detects client-side navigation.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `siteKey` | (required) | Your site's public key (`pk_…`). |
| `scriptUrl` | `https://staticdesk.app/widget.js` | Where to load the widget from. Use your own server when self-hosting, or a pinned CDN version (`https://cdn.jsdelivr.net/npm/@staticdesk/widget@0.1/dist/widget.js`). |
| `apiBase` | origin of `scriptUrl` | StaticDesk server, needed when `scriptUrl` points to a CDN. |
| `locale` | site setting, then browser | Force the language (`en`, `fr`). |
| `contactButton` | `true` | Show the floating contact button on every page. |
| `widgetId` | first contact widget | Contact widget used by the floating button, when the site has several. |
| `syncColorMode` | `true` | Follow the Docusaurus color mode. Widgets with their own `theme` attribute keep it. |

## Contact form in a page

```mdx
import StaticDeskContact from '@theme/StaticDeskContact'

## Still stuck?

<StaticDeskContact />
```

Props: `widgetId`, `mode` (`inline` or `floating`), `locale`, `theme` (`auto`,
`light`, `dark`) and `className`. Set `contactButton: false` if you only want
inline forms.

## Feedback and comments under every doc page

Add a reactions widget and a comments widget to the site in the StaticDesk
dashboard, then wrap the doc footer:

```sh
npm run swizzle @docusaurus/theme-classic DocItem/Footer -- --wrap
```

```jsx
// src/theme/DocItem/Footer/index.js
import Footer from '@theme-original/DocItem/Footer'
import StaticDeskComments from '@theme/StaticDeskComments'
import StaticDeskReactions from '@theme/StaticDeskReactions'

export default function FooterWrapper(props) {
  return (
    <>
      <Footer {...props} />
      <StaticDeskReactions className="margin-top--lg" />
      <StaticDeskComments className="margin-top--lg" />
    </>
  )
}
```

`StaticDeskReactions` and `StaticDeskComments` accept `widgetId`, `pageId`
(defaults to the page path), `locale`, `theme` and `className`. The same works
with `StaticDeskContact` to show the contact form under every page.

## Styling

The widget renders in a Shadow DOM. Match your Infima theme with CSS variables,
for example in `src/css/custom.css`:

```css
staticdesk-contact, staticdesk-comments, staticdesk-reactions {
  --sd-primary: var(--ifm-color-primary);
  --sd-font: var(--ifm-font-family-base);
  --sd-radius: var(--ifm-global-radius);
}
```

See the [widget documentation](https://github.com/brospars/staticdesk/tree/main/packages/widget)
for every variable and attribute.

## License

[MIT](LICENSE)
