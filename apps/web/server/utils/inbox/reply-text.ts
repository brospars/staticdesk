/** Line placed at the top of outgoing replies; everything below it in an answer is quoted history. */
export const REPLY_MARKER = '##- Please type your reply above this line -##'

// Lines that start the quoted history in common mail clients (English and French).
const QUOTE_HEADERS = [
  /^On .+wrote:$/i,
  /^Le .+a écrit\s?:$/i,
  /^-{2,}\s*Original Message\s*-{2,}$/i,
  /^-{2,}\s*Message d'origine\s*-{2,}$/i,
  /^_{10,}$/,
  /^From: .+$/i,
  /^De\s?: .+$/i,
]

// Signatures sent by mobile clients.
const MOBILE_SIGNATURE = /^(Sent from my .+|Envoyé de mon .+|Get Outlook for .+)$/i

/**
 * Keeps the new part of an email reply: drops the quoted history, our reply
 * marker and mobile signatures. Falls back to the full text when nothing is left.
 */
export function extractReplyText(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const kept: string[] = []

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    const bare = line.replace(/^[>\s]+/, '').trim()
    if (bare.includes(REPLY_MARKER)) break
    if (line.startsWith('>')) {
      // A quoted block ends the reply only when nothing new follows it;
      // otherwise it gives context to inline answers.
      const rest = lines.slice(index + 1)
      if (rest.every(next => next.startsWith('>') || !next.trim())) break
      kept.push(line)
      continue
    }
    // "On <date>, <name> wrote:" is sometimes wrapped over two lines.
    const joined = `${line.trim()} ${lines[index + 1]?.trim() ?? ''}`.trim()
    if (QUOTE_HEADERS.some(pattern => pattern.test(line.trim()) || pattern.test(joined))) break
    kept.push(line)
  }

  while (kept.length && !kept.at(-1)!.trim()) kept.pop()
  if (kept.length && MOBILE_SIGNATURE.test(kept.at(-1)!.trim())) kept.pop()
  // Drop a trailing "-- " signature delimiter and what follows.
  const signature = kept.findIndex(line => line === '-- ')
  const reply = (signature >= 0 ? kept.slice(0, signature) : kept).join('\n').trim()
  return reply || text.trim()
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ' }

/** Plain text version of an HTML email, for messages without a text part. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (entity, code: string) => {
      if (code.startsWith('#x') || code.startsWith('#X')) return String.fromCodePoint(Number.parseInt(code.slice(2), 16))
      if (code.startsWith('#')) return String.fromCodePoint(Number.parseInt(code.slice(1), 10))
      return ENTITIES[code.toLowerCase()] ?? entity
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
