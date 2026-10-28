import { publicAuthorTokenSchema } from '@staticdesk/core'
import { serverSupabaseServiceRole } from '#supabase/server'

// The author deletes their comment. With replies, an empty placeholder keeps the thread readable.
export default defineEventHandler(async (event) => {
  const site = usePublicSite(event)
  const id = routeId(event)
  const input = await readValidated(event, publicAuthorTokenSchema)
  await findOwnComment(event, site.id, id, input.token)

  const supabase = serverSupabaseServiceRole(event)
  const { count, error: countError } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id)
  if (countError) throw createError({ statusCode: 500, statusMessage: 'Could not delete your comment' })

  const { error } = count
    ? await supabase
        .from('comments')
        .update({ deleted_at: new Date().toISOString(), body: '', author_name: null, author_email: null })
        .eq('id', id)
    : await supabase.from('comments').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not delete your comment' })

  setResponseStatus(event, 204)
  return ''
})
