/** Public base URL of the app, without a trailing slash. */
export function useAppUrl() {
  const config = useRuntimeConfig()
  const requestUrl = useRequestURL()
  return computed(() => (String(config.public.appUrl) || requestUrl.origin).replace(/\/$/, ''))
}
