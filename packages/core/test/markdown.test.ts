import { describe, expect, it } from 'vitest'

import { fillTemplate, renderMarkdown } from '../src'

describe('renderMarkdown', () => {
  it('renders paragraphs and line breaks', () => {
    expect(renderMarkdown('Hello\nworld\n\nBye')).toBe('<p>Hello<br>world</p>\n<p>Bye</p>')
  })

  it('renders emphasis, code, headings, lists and quotes', () => {
    expect(renderMarkdown('**bold**, *italic*, _too_ and `code`')).toBe('<p><strong>bold</strong>, <em>italic</em>, <em>too</em> and <code>code</code></p>')
    expect(renderMarkdown('# Title')).toBe('<h2>Title</h2>')
    expect(renderMarkdown('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>')
    expect(renderMarkdown('1. one\n2. two')).toBe('<ol><li>one</li><li>two</li></ol>')
    expect(renderMarkdown('> quoted\n> text')).toBe('<blockquote>quoted<br>text</blockquote>')
  })

  it('keeps underscores and asterisks inside words', () => {
    expect(renderMarkdown('snake_case_name and 2*3*4')).toBe('<p>snake_case_name and 2*3*4</p>')
  })

  it('renders safe links only', () => {
    expect(renderMarkdown('[Docs](https://example.com/a?b=1&c=2)')).toBe('<p><a href="https://example.com/a?b=1&amp;c=2">Docs</a></p>')
    expect(renderMarkdown('See https://example.com/docs.')).toBe('<p>See <a href="https://example.com/docs">https://example.com/docs</a>.</p>')
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('<a')
    expect(renderMarkdown('Go to "https://example.com/a" (or https://example.com/b).')).toBe(
      '<p>Go to &quot;<a href="https://example.com/a">https://example.com/a</a>&quot; (or <a href="https://example.com/b">https://example.com/b</a>).</p>',
    )
  })

  it('escapes HTML', () => {
    expect(renderMarkdown('<script>alert("x")</script>')).toBe('<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>')
    expect(renderMarkdown('[<b>x</b>](https://example.com/"onclick=")')).not.toContain('"onclick')
  })

  it('renders variables as plain escaped text', () => {
    const variables = { name: '**Eve** [win](https://evil.example) <b>' }
    const html = renderMarkdown('Hi **{{name}}**, about {{site|our site}}', {
      variable: placeholder => fillTemplate(placeholder, variables),
    })
    expect(html).toBe('<p>Hi <strong>**Eve** [win](https://evil.example) &lt;b&gt;</strong>, about our site</p>')
  })

  it('keeps variables as written without a renderer', () => {
    expect(renderMarkdown('Hi {{name|there}}')).toBe('<p>Hi {{name|there}}</p>')
  })
})
