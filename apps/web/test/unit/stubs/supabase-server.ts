// Stands in for the #supabase/server virtual module in unit tests, which import
// server utilities without the Nuxt runtime. Tests that need it mock these.
export const serverSupabaseClient = () => {
  throw new Error('serverSupabaseClient is not available in unit tests')
}
export const serverSupabaseServiceRole = () => {
  throw new Error('serverSupabaseServiceRole is not available in unit tests')
}
export const serverSupabaseUser = () => {
  throw new Error('serverSupabaseUser is not available in unit tests')
}
