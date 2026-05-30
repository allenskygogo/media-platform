# Beta Launch Status

Last updated: 2026-05-31

## Current Status

- Website has been deployed to Vercel.
- Project code has been saved to GitHub.
- Supabase project has been created.
- `beta_applications` table has been created through the migration.
- `/beta` form can submit applications and write to Supabase.
- `/admin/beta` can read submitted beta applications.
- `VITE_SUPABASE_URL` has been configured in Vercel.
- `VITE_SUPABASE_ANON_KEY` has been configured in Vercel.
- Booking availability has been connected to Google Calendar through the Cloudflare Worker.
- The current booking conflict calendar is `web@xgfx-tw.com`.

## Booking Availability

- Student booking pages check both Supabase `bookings` records and Google Calendar before showing available time slots.
- Available booking slots are currently limited to `12:00` through `18:00`.
- Default booking duration is 3 hours.
- Google Calendar events from `web@xgfx-tw.com` are treated as unavailable time.
- If a Google Calendar event overlaps a booking slot, the student UI marks that slot as full.
- The Cloudflare Worker stores Google Calendar service account credentials as Worker secrets, not frontend environment variables.

## Temporary Admin Access

The current beta admin read access uses a temporary internal testing policy:

- Temporary beta admin read for internal testing policy.
- This is only suitable for internal beta testing.
- Before public launch, this must be replaced with real admin authentication or a server-side API / Edge Function.
- Public production access should not depend on localStorage admin state.

## Known Beta Limitations

- The member system still has localStorage / mockData risks.
- AI API has not been formally integrated.
- Payment flow has not been integrated.
- Email notification delivery has not been integrated.
- This version is suitable for internal testing, not full public production use.

## Production Readiness Notes

Before formal public launch:

- Replace temporary beta admin read policy with real admin auth or a secure server API.
- Move member data and permissions away from localStorage / mockData.
- Integrate AI API through server-side endpoints only.
- Integrate payment flow with server-side payment verification and webhook handling.
- Integrate email notifications through a server-side provider such as Resend, SendGrid, or Supabase Edge Functions.
- Keep private keys out of all `VITE_` environment variables.
