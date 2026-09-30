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
