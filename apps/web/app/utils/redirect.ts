/**
 * Returns `path` when it is a same-origin path, otherwise `fallback`.
 * Prevents open redirects through the post-login redirect cookie.
 */
export function safeRedirectPath(path: string | null | undefined, fallback = '/app'): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    return fallback
  }
  return path
}
