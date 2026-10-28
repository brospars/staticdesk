import { h } from './dom'

// A small, safe Markdown subset for comments, rendered as DOM nodes (never as
// HTML): paragraphs, line breaks, **bold**, *italic*, `code`, code blocks,
// quotes, lists and http(s) links.

const INLINE = /(`[^`\n]+`)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\b_([^_\n]+)_\b|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]*[^\s<.,:;"')\]!?])/g

function link(href: string, ...children: (Node | string)[]) {
  return h('a', { href, target: '_blank', rel: 'nofollow ugc noopener noreferrer' }, ...children)
}

export function renderInline(text: string): (Node | string)[] {
  const nodes: (Node | string)[] = []
  let last = 0
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const [, code, bold, italic, underscored, label, href, url] = match
    if (code) nodes.push(h('code', {}, code.slice(1, -1)))
    else if (bold) nodes.push(h('strong', {}, ...renderInline(bold)))
    else if (italic || underscored) nodes.push(h('em', {}, ...renderInline(italic ?? underscored!)))
    else if (label) nodes.push(link(href!, ...renderInline(label)))
    else nodes.push(link(url!, url!))
    last = match.index + match[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function lines(text: string): (Node | string)[] {
  return text.split('\n').flatMap((line, index) => index ? [h('br'), ...renderInline(line)] : renderInline(line))
}

/** Renders comment text as a fragment of block elements. */
export function renderMarkdown(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment()
  // Code blocks first: their content is never parsed.
  const parts = text.replace(/\r\n?/g, '\n').split(/^```[^\n]*\n?/m)
  parts.forEach((part, index) => {
    if (index % 2) {
      fragment.append(h('pre', {}, h('code', {}, part.replace(/\n$/, ''))))
      return
    }
    for (const block of part.split(/\n{2,}/)) {
      const trimmed = block.replace(/^\n+|\n+$/g, '')
      if (!trimmed) continue
      const rows = trimmed.split('\n')
      if (rows.every(row => /^>/.test(row))) {
        fragment.append(h('blockquote', {}, h('p', {}, ...lines(rows.map(row => row.replace(/^> ?/, '')).join('\n')))))
      }
      else if (rows.every(row => /^[-*] /.test(row))) {
        fragment.append(h('ul', {}, ...rows.map(row => h('li', {}, ...renderInline(row.slice(2))))))
      }
      else {
        fragment.append(h('p', {}, ...lines(trimmed)))
      }
    }
  })
  return fragment
}
