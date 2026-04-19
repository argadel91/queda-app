// TODO: in-plan chat/comments are not yet implemented in the UI.
// The `messages` table and RLS policies exist in the database (migration_v2.sql),
// but the frontend has no comments feature yet.
//
// When adding comments, this component should:
//   - Accept props: planId, user, isParticipant
//   - Fetch messages via db.from('messages').select('*, profiles(username)').eq('plan_id', planId)
//   - Subscribe to realtime inserts on the messages table for the plan
//   - Render a scrollable message list + a composer input (submit on Enter or button click)
//   - Guard the composer behind isParticipant (joined or organizer)

export default function PlanComments() {
  return null
}
