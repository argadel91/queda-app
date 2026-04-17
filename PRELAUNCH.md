# Pre-launch checklist

## Database
- [ ] `migration_v3_tokens.sql` executed
- [ ] `migration_v4_simplify.sql` executed
- [ ] `migration_v4b_reject.sql` executed
- [ ] `migration_v5_notifications.sql` executed
- [ ] Realtime enabled on `tokens_ledger`
- [ ] Realtime enabled on `notifications`
- [ ] Cron: `SELECT process_auto_checkouts();` — hourly
- [ ] Cron: `SELECT notify_plans_tomorrow();` — daily at 20:00 UTC
- [ ] Cron: `SELECT notify_checkout_reminder();` — hourly

## Auth
- [ ] Supabase Auth > Email provider enabled
- [ ] Site URL set to `https://www.queda.xyz`
- [ ] Redirect URLs include `https://www.queda.xyz/**`
- [ ] Email templates customised (confirmation, password reset)
- [ ] Test: signup → email confirmation → login → onboarding → welcome → feed

## Environment
- [ ] Vercel env vars set: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_GOOGLE_MAPS_KEY`, `VITE_SENTRY_DSN`
- [ ] DNS: queda.xyz → Vercel (Porkbun)
- [ ] HTTPS working on www.queda.xyz

## Features — smoke test on real mobile
- [ ] Signup (email + password) → Onboarding → Welcome slides → Feed
- [ ] Create a plan (all fields including Google Places search)
- [ ] See plan in feed (category filter works)
- [ ] Open plan detail
- [ ] Second user: join the plan (check token deducted in /wallet)
- [ ] Organizer: see "Going (1)" on plan detail
- [ ] Organizer: cancel plan → attendee refunded, plan removed from feed
- [ ] Create another plan, second user joins
- [ ] Wait for plan time to pass (or set date in past via SQL)
- [ ] Organizer: check-out → mark attendance → finalise
- [ ] Verify: attendee refunded +1, organizer gets +1 in wallet
- [ ] Test approval mode: create plan with approval, request to join, accept, reject
- [ ] Test leave: join a plan, then leave before deadline → refund
- [ ] Notifications: bell shows unread count after someone joins your plan
- [ ] /my-plans: both tabs (Created / Joined) show correct plans
- [ ] /wallet: balance correct, history shows all movements, 5-rule explainer visible

## PWA
- [ ] Add to home screen works on iOS Safari and Android Chrome
- [ ] Service worker caches static assets
- [ ] Manifest loads (name, icons, theme colour)

## Edge cases
- [ ] Attempt to join with 0 tokens → error message shown
- [ ] Attempt to join a full plan → "Plan is full" shown
- [ ] Try to join own plan → blocked by SQL function
- [ ] Cancel plan with 0 attendees → organizer gets no bonus, plan closed
- [ ] Auto-checkout: wait 48h after plan time → verify organizer penalised

## Before opening to real users
- [ ] Remove any test plans from DB
- [ ] Verify Sentry is receiving errors (trigger one intentionally)
- [ ] TODO(auth): plan Twilio/WhatsApp OTP migration timeline
- [ ] TODO(push): plan VAPID keys + server push implementation
