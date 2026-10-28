// Sends delayed auto-replies and follow-up reminders. Called every few minutes by Vercel Cron (or any scheduler).
export default defineEventHandler(async (event) => {
  requireCronSecret(event)

  const [autoReplies, followUps] = await Promise.all([
    sendDueAutoReplies(event, { max: 100 }),
    sendFollowUpReminders(event),
  ])
  return { autoReplies, followUps }
})
