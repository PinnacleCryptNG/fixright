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

- Stack is Clerk auth + Neon Postgres (`getSql()` in src/lib/db.server.ts), never Supabase/Firebase — the spec requires it.
- `db/schema.sql` and `db/seed.sql` are idempotent so they can be re-run safely.
- Roles live in the `users` table, resolved server-side; admin only via `FIXRIGHT_ADMIN_EMAIL`; every admin server fn calls `requireRole("admin")` — route gating is UI only.
- Authenticated pages sit under `src/routes/_authenticated/` behind a client Clerk gate, because Clerk's session is browser-side.
- Unimplemented features render `<NotBuiltYet>`; never ship fake controls.
- Mapbox location picker (src/components/location-picker.tsx) reverse-geocodes State + LGA and never guesses an uncertain LGA.
- Theme: `.dark` class on <html> set pre-paint by src/components/theme.tsx; all colours are tokens in src/styles.css.
- Server/domain rules: see src/lib/AGENTS.md.
