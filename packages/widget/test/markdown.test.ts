import { describe, expect, it } from 'vitest'

import { renderMarkdown } from '../src/markdown'

function html(text: string) {
  const div = document.createElement('div')
  div.append(renderMarkdown(text))
  return div.innerHTML
}

describe('renderMarkdown', () => {
  it('renders paragraphs, line breaks and inline styles', () => {
    expect(html('Hello **world**\nwith *style* and `code`\n\nSecond')).toBe(
      '<p>Hello <strong>world</strong><br>with <em>style</em> and <code>code</code></p><p>Second</p>',
    )
  })

  it('never interprets HTML', () => {
    expect(html('<img src=x onerror=alert(1)> **<b>x</b>**')).toBe(
      '<p>&lt;img src=x onerror=alert(1)&gt; <strong>&lt;b&gt;x&lt;/b&gt;</strong></p>',
    )
  })

  it('links http(s) URLs only, without passing referrers or ranking', () => {
    expect(html('[docs](https://acme.dev/a) and https://acme.dev/b. [x](javascript:alert(1))')).toBe(
      '<p><a href="https://acme.dev/a" target="_blank" rel="nofollow ugc noopener noreferrer">docs</a> and '
      + '<a href="https://acme.dev/b" target="_blank" rel="nofollow ugc noopener noreferrer">https://acme.dev/b</a>. '
      + '[x](javascript:alert(1))</p>',
    )
  })

  it('keeps code blocks verbatim', () => {
    expect(html('Before\n```js\nconst a = **1**\n\nlet b\n```\nAfter')).toBe(
      '<p>Before</p><pre><code>const a = **1**\n\nlet b</code></pre><p>After</p>',
    )
  })

  it('renders quotes and lists', () => {
    expect(html('> quoted\n> text\n\n- one\n- *two*')).toBe(
      '<blockquote><p>quoted<br>text</p></blockquote><ul><li>one</li><li><em>two</em></li></ul>',
    )
  })

  it('does not treat underscores inside words as italics', () => {
    expect(html('snake_case_name')).toBe('<p>snake_case_name</p>')
  })
})
