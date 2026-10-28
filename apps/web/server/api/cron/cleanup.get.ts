// Daily housekeeping: removes attachments never linked to a message (abandoned
// uploads) or left behind by deleted conversations. Called by Vercel Cron (or any scheduler).
export default defineEventHandler(async (event) => {
  requireCronSecret(event)
  return { attachmentsDeleted: await deleteUnlinkedAttachments(event) }
})
