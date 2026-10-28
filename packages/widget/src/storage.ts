/**
 * Small JSON store in localStorage for the secrets that let visitors change
 * what they posted. Fails silently when storage is unavailable (private mode,
 * blocked cookies): visitors then simply cannot edit after a reload.
 */
export function readStore<T extends object>(key: string): Partial<T> {
  try {
    const value = JSON.parse(localStorage.getItem(`staticdesk:${key}`) ?? '{}') as unknown
    return value && typeof value === 'object' ? value as Partial<T> : {}
  }
  catch {
    return {}
  }
}

export function writeStore(key: string, value: object) {
  try {
    localStorage.setItem(`staticdesk:${key}`, JSON.stringify(value))
  }
  catch {
    // Storage full or unavailable.
  }
}
