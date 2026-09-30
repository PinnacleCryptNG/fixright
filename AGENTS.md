<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## FixRight architecture rules

- Data access is Neon Postgres via `src/lib/db.server.ts` (`getSql()`), never Supabase/Firebase — the product spec requires Clerk + Neon.
- Schema and seed data live in `db/schema.sql` and `db/seed.sql`, both idempotent so they can be re-run safely.
- Auth is Clerk (`@clerk/clerk-react`); server functions verify the Clerk session token in `src/lib/clerk-auth.server.ts` via remote JWKS, so no Clerk secret key is required.
- The user's role is stored in the `users` table and resolved server-side (`src/lib/users.server.ts`); frontend state is never trusted for roles.
- Admin is granted only when the Clerk email matches the `FIXRIGHT_ADMIN_EMAIL` env var — the single configuration point, so no admin email is hardcoded and there is no public admin signup.
- Every admin server function calls `requireRole("admin")` before returning data; route gating in `src/routes/_authenticated/admin.tsx` is UI only and never the security boundary.
- All client-callable server functions live in `src/lib/fixright.functions.ts` and import `*.server` modules inside handlers, keeping server-only code out of client bundles.
- Authenticated pages live under `src/routes/_authenticated/` behind a client-rendered Clerk gate, because Clerk keeps its session in the browser.
- Unimplemented features render `<NotBuiltYet>`; never ship fake interactive controls that imply working functionality.
- Technician matching lives only in `src/lib/matching.server.ts` (`findMatch`), so the algorithm can be replaced (e.g. Maps distance) without touching the booking flow.
- Booking writes live in `src/lib/booking.server.ts`; an appointment is created only in `confirmBooking`, after the customer confirms, and the slot is re-checked there to avoid double-booking.
- Requests are offered to every eligible technician via `request_offers`; the first accept wins through a conditional `update ... where status='matching' and matched_technician_id is null`, so duplicate claims are impossible.
- Demo technicians have no login; `dispatchRequest` auto-accepts for the top-ranked one only when no eligible technician has a Clerk account, keeping the demo usable.
- Technician logic lives in `src/lib/technician.server.ts`; customer contact details are exposed to a technician only after they accept.
- Nigerian states and LGAs live only in `src/lib/nigeria-locations.ts` (36 states + FCT, 774 LGAs), used by both UI and server validation, so location data is maintained in one place.
- Technician coverage is one state, either `covers_entire_state` or specific LGAs in `technician_service_areas`; there is no travel radius or distance matching.
- Customer location comes from Google Maps (`src/components/location-picker.tsx`), which reverse-geocodes State + LGA; an uncertain LGA is never guessed, and a manual State/LGA fallback is shown only if the map can't load.
- Technician profile photos upload through Clerk (`user.setProfileImage`), and the resulting URL is stored in `users.avatar_url`; there is no separate image hosting.
