# src/lib rules

- Client-callable server fns live in `fixright.functions.ts` and import `*.server` modules inside handlers, keeping server code out of client bundles.
- Clerk tokens are verified in `clerk-auth.server.ts` via remote JWKS; `CLERK_SECRET_KEY` is needed only to look up the user's email, because the default session token carries none and admin matching depends on it.
- Matching lives only in `matching.server.ts` (`findMatch`) so it can be swapped without touching booking.
- Appointments are created only in `booking.server.ts` `markPaidAndConfirm`, after server-side Paystack verification (amount, currency, status, reference). The partial unique index on appointments makes duplicate confirmation impossible; the webhook at src/routes/api/public/paystack-webhook.ts verifies x-paystack-signature before processing.
- Requests are offered to all eligible technicians via `request_offers`; first accept wins via a conditional update, so duplicate claims are impossible.
- Demo technicians have no login; `dispatchRequest` auto-accepts for the top one only when no eligible technician has a Clerk account.
- `technician.server.ts` exposes customer contact only after acceptance.
- States/LGAs live only in `nigeria-locations.ts` (shared by UI and validation); coverage is one state, whole or listed LGAs, no radius.
- Technician photos upload via Clerk `setProfileImage`, URL stored in `users.avatar_url`.
