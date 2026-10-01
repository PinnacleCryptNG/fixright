import { getSql } from "./db.server";
import type { AppUser, UserRole } from "./types";
import type { VerifiedIdentity } from "./clerk-auth.server";

/**
 * Role is application data, resolved and stored server-side.
 * The single configuration point for the demo admin account is the
 * FIXRIGHT_ADMIN_EMAIL environment variable.
 */
function isConfiguredAdmin(email: string | null): boolean {
  const configured = process.env["FIXRIGHT_ADMIN_EMAIL"]?.trim().toLowerCase();
  if (!configured || !email) return false;
  return email.trim().toLowerCase() === configured;
}

type SyncInput = {
  identity: VerifiedIdentity;
  fullName?: string | null;
  avatarUrl?: string | null;
  /** Requested role at sign-up. `admin` is never accepted from the client. */
  desiredRole?: Exclude<UserRole, "admin">;
};

export async function syncAppUser({
  identity,
  fullName,
  avatarUrl,
  desiredRole,
}: SyncInput): Promise<AppUser> {
  const sql = getSql();
  const email = identity.email;
  const initialRole: UserRole = isConfiguredAdmin(email) ? "admin" : (desiredRole ?? "customer");

  const rows = (await sql`
    insert into users (clerk_user_id, email, phone, full_name, avatar_url, role)
    values (${identity.clerkUserId}, ${email}, ${identity.phone ?? null}, ${fullName ?? null}, ${avatarUrl ?? null}, ${initialRole}::user_role)
    on conflict (clerk_user_id) do update set
      email = coalesce(excluded.email, users.email),
      phone = coalesce(users.phone, excluded.phone),
      full_name = coalesce(users.full_name, excluded.full_name),
      avatar_url = coalesce(users.avatar_url, excluded.avatar_url),
      updated_at = now()
    returning id, role, full_name, phone, email, avatar_url
  `) as AppUser[];

  let user = rows[0]!;

  // Keep the configured admin account authoritative.
  if (isConfiguredAdmin(user.email) && user.role !== "admin") {
    const promoted = (await sql`
      update users set role = 'admin', updated_at = now() where id = ${user.id}
      returning id, role, full_name, phone, email, avatar_url
    `) as AppUser[];
    user = promoted[0]!;
  }

  if (user.role === "technician") {
    await sql`
      insert into technician_profiles (user_id)
      values (${user.id})
      on conflict (user_id) do nothing
    `;
  }

  return user;
}

export async function getAppUserByClerkId(clerkUserId: string): Promise<AppUser | null> {
  const sql = getSql();
  const rows = (await sql`
    select id, role, full_name, phone, email, avatar_url
    from users where clerk_user_id = ${clerkUserId}
  `) as AppUser[];
  return rows[0] ?? null;
}

export async function requireRole(
  identity: VerifiedIdentity,
  roles: UserRole[],
): Promise<AppUser> {
  const user = await syncAppUser({ identity });
  if (!roles.includes(user.role)) throw new Response("Forbidden", { status: 403 });
  return user;
}
