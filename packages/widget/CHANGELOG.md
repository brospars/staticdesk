# @staticdesk/widget

## 0.1.0

### Minor Changes

- 4f80648: New `<staticdesk-comments>` (replies, anonymous posting, Markdown, edit and delete one's own comment) and `<staticdesk-reactions>` ("Was this page helpful?" with an optional comment, emoji reactions) elements. Every element tied to a page accepts a `page-id` attribute.
- 7ca0049: Contact form attachments: forms that accept files show a file input; files are uploaded to private storage before the message is sent.
- 56380f3: Contact form: custom fields (text, long text, choice list, checkbox), optional, required or hidden name, custom error message and redirect after sending.
- d59b206: New Docusaurus plugin: loads the widget, adds the floating contact button, follows the light and dark modes and provides the `@theme/StaticDeskContact` component. Widgets now react to changes of their `theme` attribute.
- d29b9f8: First public release: `<staticdesk-contact>` with inline and floating modes, theming with CSS variables, English and French.

### Patch Changes

- 3cd332d: Relicensed under the MIT license (the server stays under the AGPL-3.0), so the widget and the plugins can be bundled into any site.
