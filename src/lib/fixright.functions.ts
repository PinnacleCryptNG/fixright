import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { isValidLga, NIGERIA_STATES } from "./nigeria-locations";
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

const PUBLIC_TECH_COLUMNS = `tp.id, u.full_name, u.avatar_url, tp.bio, tp.rating, tp.completed_jobs,
  tp.years_experience, tp.verification_status, tp.available,
  array[coalesce(tp.showcase_area, (select a.lga || ', ' || a.state from technician_service_areas a where a.technician_id = tp.id limit 1))] as areas,
  coalesce((select array_agg(s.name order by s.name) from technician_services ts
            join services s on s.id = ts.service_id where ts.technician_id = tp.id), '{}') as services`;

/** Public: homepage showcase — the top technician per state (max 3). */
export const listTechnicians = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("./db.server");
  const sql = getSql();
  return (await sql.query(`
    select * from (
      select distinct on (a0.state) ${PUBLIC_TECH_COLUMNS}
      from technician_profiles tp
      join users u on u.id = tp.user_id
      join lateral (select state from technician_service_areas where technician_id = tp.id limit 1) a0 on true
      where tp.verification_status = 'verified' and tp.available and tp.showcase_area is not null
      order by a0.state, tp.rating desc, tp.completed_jobs desc
    ) t order by completed_jobs desc limit 3
  `)) as TechnicianCard[];
});

/** Public: every verified technician, for the technicians page. */
export const listAllTechnicians = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("./db.server");
  const sql = getSql();
  return (await sql.query(`
    select ${PUBLIC_TECH_COLUMNS}
    from technician_profiles tp join users u on u.id = tp.user_id
    where tp.verification_status = 'verified'
    order by tp.rating desc, tp.completed_jobs desc limit 60
  `)) as TechnicianCard[];
});

/** Public: one verified technician's profile. Never returns contact details or IDs beyond the profile id. */
export const getPublicTechnician = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { getSql } = await import("./db.server");
    const sql = getSql();
    const rows = (await sql.query(
      `select ${PUBLIC_TECH_COLUMNS}, to_char(tp.work_start, 'HH24:MI') as work_start, to_char(tp.work_end, 'HH24:MI') as work_end
       from technician_profiles tp join users u on u.id = tp.user_id
       where tp.id = $1 and tp.verification_status = 'verified'`,
      [data.id],
    )) as Array<TechnicianCard & { work_start: string | null; work_end: string | null }>;
    const tech = rows[0];
    if (!tech) return null;
    const areas = (await sql`
      select state, lga, covers_entire_state from technician_service_areas
      where technician_id = ${data.id} order by lga nulls first
    `) as Array<{ state: string; lga: string | null; covers_entire_state: boolean }>;
    return {
      ...tech,
      coverage: {
        state: areas[0]?.state ?? null,
        entireState: areas.some((a) => a.covers_entire_state),
        lgas: areas.filter((a) => a.lga).map((a) => a.lga as string),
      },
    };
  });

const syncSchema = z.object({
  fullName: z.string().max(120).nullable().optional(),
  avatarUrl: z
    .string()
    .url()
    .max(500)
    .refine((u) => u.startsWith("https://"), "Invalid photo link")
    .nullable()
    .optional(),
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
           coalesce(array_agg(distinct case when a.covers_entire_state then 'All of ' || a.state else a.lga || ', ' || a.state end) filter (where a.state is not null), '{}') as areas,
           coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}') as services
    from technician_profiles tp
    join users u on u.id = tp.user_id
    left join technician_service_areas a on a.technician_id = tp.id
    left join technician_services ts on ts.technician_id = tp.id
    left join services s on s.id = ts.service_id
    where not u.is_demo
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
    select id, full_name, email, phone, created_at,
           case when clerk_user_id is not null then 'active' else 'no_login' end as account_status
    from users where role = 'customer' and not is_demo order by created_at desc limit 100
  `) as Array<{
    id: string;
    account_status: "active" | "no_login";
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
    state: z.string().trim().min(2).max(80),
    lga: z.string().trim().min(2).max(80),
    landmark: z.string().trim().max(160).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    date: z.string().regex(dateRe),
    windowStart: z.string().regex(timeRe),
    windowEnd: z.string().regex(timeRe),
  })
  .refine((d) => d.windowEnd > d.windowStart, { message: "Window end must be after start" })
  .refine((d) => isValidLga(d.state, d.lga), { message: "Unknown local government area" })
  .refine((d) => d.date >= new Date(Date.now() + 3600_000).toISOString().slice(0, 10), {
    message: "Date must be today or later",
  })
  .refine((d) => new Date(`${d.date}T00:00:00Z`).toISOString().slice(0, 10) === d.date, {
    message: "Choose a real date",
  })
  .refine(
    (d) => d.date <= new Date(Date.now() + 3600_000 + 90 * 86400_000).toISOString().slice(0, 10),
    {
      message: "Choose a date within the next 90 days",
    },
  );

async function requireCustomer() {
  const { requireIdentity } = await import("./clerk-auth.server");
  const { requireRole } = await import("./users.server");
  return requireRole(await requireIdentity(), ["customer"]);
}

export const submitRepairRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => newRequestSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await requireCustomer();
    (await import("./rate-limit.server")).rateLimit(`req:${user.id}`, 10, 10 * 60_000);
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

export const initializeRepairPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await requireCustomer();
    (await import("./rate-limit.server")).rateLimit(`payinit:${user.id}`, 10, 10 * 60_000);
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const origin = getRequestUrl().origin;
    const m = await import("./booking.server");
    return m.initializePayment(user, data.requestId, `${origin}/book?request=${data.requestId}`);
  });

export const verifyRepairPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ requestId: z.string().uuid(), reference: z.string().trim().min(8).max(80) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const user = await requireCustomer();
    (await import("./rate-limit.server")).rateLimit(`payverify:${user.id}`, 30, 10 * 60_000);
    const m = await import("./booking.server");
    return m.verifyAndConfirmPayment(user, data.requestId, data.reference);
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
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ]{10,16}$/, "Enter a valid phone number"),
    avatarUrl: z
      .string()
      .trim()
      .url()
      .max(500)
      .refine((u) => u.startsWith("https://"), "Invalid photo link")
      .nullable()
      .optional(),
    bio: z.string().trim().max(600).nullable().optional(),
    yearsExperience: z.number().int().min(0).max(60),
    serviceIds: z.array(z.string().uuid()).min(1).max(20),
    state: z.string().refine((v) => NIGERIA_STATES.includes(v), "Choose a state"),
    entireState: z.boolean(),
    lgas: z.array(z.string().max(80)).max(60),
    workStart: z.string().regex(timeRe),
    workEnd: z.string().regex(timeRe),
    available: z.boolean(),
  })
  .refine((d) => d.workEnd > d.workStart, { message: "Working hours must end after they start" })
  .refine(
    (d) => d.entireState || (d.lgas.length > 0 && d.lgas.every((l) => isValidLga(d.state, l))),
    {
      message: "Choose at least one LGA in your state",
    },
  );

export const saveMyTechProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => profileSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await requireTechnician();
    (await import("./rate-limit.server")).rateLimit(`profile:${user.id}`, 20, 10 * 60_000);
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

/** Admin only: full technician profile for review. */
export const adminGetTechnician = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireIdentity } = await import("./clerk-auth.server");
    const { requireRole } = await import("./users.server");
    const { getSql } = await import("./db.server");
    await requireRole(await requireIdentity(), ["admin"]);
    const sql = getSql();
    const rows = (await sql`
      select tp.id, u.full_name, u.email, u.phone, u.avatar_url, tp.bio, tp.years_experience,
             tp.verification_status, tp.available, tp.rating, tp.completed_jobs,
             to_char(tp.work_start, 'HH24:MI') as work_start, to_char(tp.work_end, 'HH24:MI') as work_end,
             u.created_at,
             coalesce((select array_agg(a.lga order by a.lga) from technician_service_areas a where a.technician_id = tp.id and not a.covers_entire_state), '{}') as lgas,
             (select a.state from technician_service_areas a where a.technician_id = tp.id limit 1) as state,
             coalesce((select bool_or(a.covers_entire_state) from technician_service_areas a where a.technician_id = tp.id), false) as entire_state,
             coalesce((select array_agg(s.name order by s.name) from technician_services ts join services s on s.id = ts.service_id where ts.technician_id = tp.id), '{}') as services
      from technician_profiles tp join users u on u.id = tp.user_id
      where tp.id = ${data.id} and not u.is_demo
    `) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      avatar_url: string | null;
      bio: string | null;
      years_experience: number;
      verification_status: import("./types").VerificationStatus;
      available: boolean;
      rating: string;
      completed_jobs: number;
      work_start: string;
      work_end: string;
      created_at: string;
      state: string | null;
      entire_state: boolean;
      lgas: string[];
      services: string[];
    }>;
    if (!rows[0]) throw new Error("Technician not found.");
    return rows[0];
  });

/** Admin only: change a technician's verification status (persisted). */
export const adminSetVerification = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "verified", "rejected", "suspended"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireIdentity } = await import("./clerk-auth.server");
    const { requireRole } = await import("./users.server");
    const { getSql } = await import("./db.server");
    await requireRole(await requireIdentity(), ["admin"]);
    const sql = getSql();
    // Capture the previous status atomically so the email is tied to a real change.
    const rows = (await sql`
      with prev as (
        select tp.id, tp.verification_status as old_status from technician_profiles tp
        join users u on u.id = tp.user_id
        where tp.id = ${data.id} and not u.is_demo for update of tp
      )
      update technician_profiles t set verification_status = ${data.status}::verification_status, updated_at = now()
      from prev where t.id = prev.id returning prev.old_status`) as Array<{ old_status: string }>;
    if (rows.length === 0) throw new Error("Technician not found.");
    const oldStatus = rows[0]!.old_status;
    if (oldStatus === "pending" && (data.status === "verified" || data.status === "rejected")) {
      const { sendVerificationEmail } = await import("./verification-email.server");
      await sendVerificationEmail(data.id, data.status);
    }
    if (data.status !== "verified") {
      // Ineligible technicians lose any open offers immediately.
      await sql`update request_offers set status = 'withdrawn', responded_at = now()
                where technician_id = ${data.id} and status = 'offered'`;
    }
    return { ok: true, status: data.status };
  });

/** Public: Mapbox public (pk.) token for the browser map. Null when not configured. */
export const getMapsConfig = createServerFn({ method: "GET" }).handler(async () => {
  return { key: process.env["MAPBOX_PUBLIC_TOKEN"] ?? null };
});
