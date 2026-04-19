import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { usePlanDetail } from '../hooks/usePlanDetail.js'
import PlanHeader from '../components/plan/PlanHeader.jsx'
import PlanActions from '../components/plan/PlanActions.jsx'
import PlanAttendees from '../components/plan/PlanAttendees.jsx'
import PlanComments from '../components/plan/PlanComments.jsx'
import { theme as t } from '../theme.js'

export default function PlanDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const {
    plan, organizer, joined, pending, myStatus,
    loading, busy, err,
    attendance, setAttendance,
    actions,
  } = usePlanDetail(id)

  if (loading) return <p style={{ color: t.textDim, padding: 24 }}>Loading…</p>
  if (!plan) return <p style={{ color: t.textDim, padding: 24 }}>Plan not found.</p>

  const isOrg = user?.id === plan.user_id
  const isParticipant = myStatus === 'joined' || myStatus === 'pending' || isOrg
  const infoHidden = plan.join_mode === 'private' && !isParticipant
  const planTs = new Date(plan.date + 'T' + plan.time)
  const needsCheckout = isOrg && planTs < new Date() && !plan.checked_out_at && plan.status !== 'cancelled'

  return (
    <div>
      <PlanHeader
        plan={plan}
        organizer={organizer}
        joined={joined}
        infoHidden={infoHidden}
      />

      <PlanActions
        plan={plan}
        user={user}
        joined={joined}
        myStatus={myStatus}
        busy={busy}
        err={err}
        attendance={attendance}
        setAttendance={setAttendance}
        actions={actions}
      />

      <PlanAttendees
        plan={plan}
        joined={joined}
        pending={pending}
        isOrg={isOrg}
        busy={busy}
        infoHidden={infoHidden}
        needsCheckout={needsCheckout}
        actions={actions}
      />

      <PlanComments />

      <Link to="/" style={{ display: 'block', marginTop: 16, color: t.textDim, fontSize: 13, textDecoration: 'none' }}>← Feed</Link>
    </div>
  )
}
