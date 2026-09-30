import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { AdminOverview, AppUser, ServiceRecord, TechnicianCard } from "./types";

/** Public: active service categories. */
export const listServices = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("./db.server");
  const sql = getSql();
  return (await sql`
    select id, name, description, category, base_service_fee, active
    from services where active = true order by
      case when name = 'Other' then 1 else 0 end, name
  `) as ServiceRecord[];
});

/** Public: verified, available demo technicians. */
export const listTechnicians = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("./db.server");
  const sql = getSql();
  return (await sql`
    select tp.id,
           u.full_name,
           tp.bio,
           tp.rating,
           tp.completed_jobs,
           tp.years_experience,
           tp.verification_status,
           tp.available,
           coalesce(array_agg(distinct a.area_name) filter (where a.area_name is not null), '{}') as areas,
           coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}') as services
    from technician_profiles tp
    join users u on u.id = tp.user_id
    left join technician_service_areas a on a.technician_id = tp.id
    left join technician_services ts on ts.technician_id = tp.id
    left join services s on s.id = ts.service_id
    where tp.verification_status = 'verified'
    group by tp.id, u.full_name
    order by tp.completed_jobs desc
  `) as TechnicianCard[];
});

const syncSchema = z.object({
  fullName: z.string().max(120).nullable().optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
  desiredRole: z.enum(["customer", "technician"]).optional(),
});

/** Authenticated: create/refresh the application user row and return its role. */
export const syncCurrentUser = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => syncSchema.parse(data ?? {}))
  .handler(async ({ data }): Promise<AppUser> => {
    const { requireIdentity } = await import("./clerk-auth.server");
    const { syncAppUser } = await import("./users.server");
    const identity = await requireIdentity();
    return syncAppUser({
      identity,
      fullName: data.fullName ?? null,
      avatarUrl: data.avatarUrl ?? null,
      ...(data.desiredRole ? { desiredRole: data.desiredRole } : {}),
    });
  });

/** Admin only: platform counts. Authorization happens before any data is returned. */
export const getAdminOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminOverview> => {
    const { requireIdentity } = await import("./clerk-auth.server");
    const { requireRole } = await import("./users.server");
    const { getSql } = await import("./db.server");
    await requireRole(await requireIdentity(), ["admin"]);

    const sql = getSql();
    const rows = (await sql`
      select
        (select count(*) from users where role = 'customer')::int as customers,
        (select count(*) from technician_profiles)::int as technicians,
        (select count(*) from technician_profiles where verification_status = 'verified')::int as "verifiedTechnicians",
        (select count(*) from services where active = true)::int as services,
        (select count(*) from repair_requests)::int as requests,
        (select count(*) from appointments)::int as appointments
    `) as AdminOverview[];
    return rows[0]!;
  },
);

/** Admin only: technician roster. */
export const adminListTechnicians = createServerFn({ method: "GET" }).handler(async () => {
  const { requireIdentity } = await import("./clerk-auth.server");
  const { requireRole } = await import("./users.server");
  const { getSql } = await import("./db.server");
  await requireRole(await requireIdentity(), ["admin"]);

  const sql = getSql();
  return (await sql`
    select tp.id, u.full_name, u.email, u.phone, tp.rating, tp.completed_jobs,
           tp.years_experience, tp.verification_status, tp.available, tp.bio,
           coalesce(array_agg(distinct a.area_name) filter (where a.area_name is not null), '{}') as areas,
           coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}') as services
    from technician_profiles tp
    join users u on u.id = tp.user_id
    left join technician_service_areas a on a.technician_id = tp.id
    left join technician_services ts on ts.technician_id = tp.id
    left join services s on s.id = ts.service_id
    group by tp.id, u.full_name, u.email, u.phone
    order by u.full_name
  `) as Array<TechnicianCard & { email: string | null; phone: string | null }>;
});

/** Admin only: customer accounts. */
export const adminListCustomers = createServerFn({ method: "GET" }).handler(async () => {
  const { requireIdentity } = await import("./clerk-auth.server");
  const { requireRole } = await import("./users.server");
  const { getSql } = await import("./db.server");
  await requireRole(await requireIdentity(), ["admin"]);

  const sql = getSql();
  return (await sql`
    select id, full_name, email, phone, created_at
    from users where role = 'customer' order by created_at desc limit 100
  `) as Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string;
  }>;
});

/** Admin only: service catalogue. */
export const adminListServices = createServerFn({ method: "GET" }).handler(async () => {
  const { requireIdentity } = await import("./clerk-auth.server");
  const { requireRole } = await import("./users.server");
  const { getSql } = await import("./db.server");
  await requireRole(await requireIdentity(), ["admin"]);

  const sql = getSql();
  return (await sql`
    select id, name, description, category, base_service_fee, active
    from services order by name
  `) as ServiceRecord[];
});
