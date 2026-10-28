/** Wraps fetch so that URLs starting with `from` are requested from `to`. */
export function rewriteFetch(fetcher: typeof fetch, from: string, to: string): typeof fetch {
  const prefix = `${from}/`
  return (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (!url.startsWith(prefix)) return fetcher(input, init)
    const target = to + url.slice(from.length)
    return fetcher(input instanceof Request ? new Request(target, input) : target, init)
  }
}
