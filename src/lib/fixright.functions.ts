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

// ---------------------------------------------------------------------------
// Customer booking flow
// ---------------------------------------------------------------------------

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const newRequestSchema = z
  .object({
    serviceId: z.string().uuid(),
    problemDescription: z.string().trim().min(10).max(2000),
    brand: z.string().trim().max(80).nullable().optional(),
    model: z.string().trim().max(80).nullable().optional(),
    address: z.string().trim().min(5).max(300),
    areaName: z.string().trim().min(2).max(80),
    landmark: z.string().trim().max(160).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    date: z.string().regex(dateRe),
    windowStart: z.string().regex(timeRe),
    windowEnd: z.string().regex(timeRe),
  })
  .refine((d) => d.windowEnd > d.windowStart, { message: "Window end must be after start" })
  .refine((d) => d.date >= new Date(Date.now() + 3600_000).toISOString().slice(0, 10), {
    message: "Date must be today or later",
  });

async function requireCustomer() {
  const { requireIdentity } = await import("./clerk-auth.server");
  const { requireRole } = await import("./users.server");
  return requireRole(await requireIdentity(), ["customer"]);
}

/** Public: area names currently covered by verified technicians. */
export const listBookableAreas = createServerFn({ method: "GET" }).handler(async () => {
  const m = await import("./booking.server");
  return m.listBookableAreas();
});

export const submitRepairRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => newRequestSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await requireCustomer();
    const m = await import("./booking.server");
    return m.createRepairRequest(user, data);
  });

const idSchema = z.object({ requestId: z.string().uuid() });

export const getRepairRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await requireCustomer();
    const m = await import("./booking.server");
    return m.getBooking(user, data.requestId);
  });

export const confirmRepairBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await requireCustomer();
    const m = await import("./booking.server");
    return m.confirmBooking(user, data.requestId);
  });

export const cancelRepairRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await requireCustomer();
    const m = await import("./booking.server");
    return m.cancelUnconfirmedRequest(user, data.requestId);
  });

export const getMyBookings = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireCustomer();
  const m = await import("./booking.server");
  return m.listCustomerBookings(user);
});

// ---------------------------------------------------------------------------
// Technician experience
// ---------------------------------------------------------------------------

async function requireTechnician() {
  const { requireIdentity } = await import("./clerk-auth.server");
  const { requireRole } = await import("./users.server");
  return requireRole(await requireIdentity(), ["technician"]);
}

export const getMyTechProfile = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireTechnician();
  const m = await import("./technician.server");
  return m.getMyProfile(user);
});

const profileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().regex(/^\+?[0-9 ]{10,16}$/, "Enter a valid phone number"),
    avatarUrl: z.string().trim().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
    bio: z.string().trim().max(600).nullable().optional(),
    yearsExperience: z.number().int().min(0).max(60),
    serviceIds: z.array(z.string().uuid()).min(1).max(20),
    areas: z.array(z.string().trim().min(2).max(80)).min(1).max(20),
    radiusKm: z.number().int().min(1).max(50),
    workStart: z.string().regex(timeRe),
    workEnd: z.string().regex(timeRe),
    available: z.boolean(),
  })
  .refine((d) => d.workEnd > d.workStart, { message: "Working hours must end after they start" });

export const saveMyTechProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => profileSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await requireTechnician();
    const m = await import("./technician.server");
    return m.saveMyProfile(user, data);
  });

export const setMyAvailability = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ available: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const user = await requireTechnician();
    const m = await import("./technician.server");
    return m.setMyAvailability(user, data.available);
  });

export const listMyOffers = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireTechnician();
  const m = await import("./technician.server");
  return m.listMyOffers(user);
});

export const getMyOffer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await requireTechnician();
    const m = await import("./technician.server");
    return (await m.listMyOffers(user, data.requestId))[0] ?? null;
  });

export const acceptRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await requireTechnician();
    const m = await import("./technician.server");
    return m.acceptMyOffer(user, data.requestId);
  });

export const declineRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await requireTechnician();
    const m = await import("./technician.server");
    return m.declineMyOffer(user, data.requestId);
  });

export const listMyJobs = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireTechnician();
  const m = await import("./technician.server");
  return m.listMyJobs(user);
});

export const advanceJob = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ appointmentId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const user = await requireTechnician();
    const m = await import("./technician.server");
    return m.advanceMyJob(user, data.appointmentId);
  });
