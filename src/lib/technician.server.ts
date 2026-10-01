import { getSql } from "./db.server";
import { acceptOffer, declineOffer } from "./booking.server";
import type { AppUser, Coverage, TechJob, TechOffer, TechProfile } from "./types";

export async function getTechProfileId(user: AppUser): Promise<string> {
  const sql = getSql();
  const rows = (await sql`
    insert into technician_profiles (user_id) values (${user.id})
    on conflict (user_id) do update set user_id = excluded.user_id
    returning id
  `) as Array<{ id: string }>;
  return rows[0]!.id;
}

export async function getMyProfile(user: AppUser): Promise<TechProfile> {
  const sql = getSql();
  const id = await getTechProfileId(user);
  const rows = (await sql`
    select tp.id, u.full_name, u.phone, u.email, u.avatar_url, tp.bio, tp.years_experience,
           tp.verification_status, tp.rating, tp.completed_jobs, tp.available,
           to_char(tp.work_start, 'HH24:MI') as work_start, to_char(tp.work_end, 'HH24:MI') as work_end,
           coalesce((select array_agg(ts.service_id) from technician_services ts where ts.technician_id = tp.id), '{}') as service_ids
    from technician_profiles tp join users u on u.id = tp.user_id
    where tp.id = ${id}
  `) as Array<Omit<TechProfile, "coverage" | "onboarded">>;
  const areas = (await sql`
    select state, lga, covers_entire_state from technician_service_areas
    where technician_id = ${id} order by lga
  `) as Array<{ state: string; lga: string | null; covers_entire_state: boolean }>;
  const coverage: Coverage = {
    state: areas[0]?.state ?? null,
    entireState: areas.some((a) => a.covers_entire_state),
    lgas: areas.filter((a) => !a.covers_entire_state && a.lga).map((a) => a.lga!),
  };
  const p = rows[0]!;
  const hasCoverage = Boolean(coverage.state) && (coverage.entireState || coverage.lgas.length > 0);
  return { ...p, coverage, onboarded: p.service_ids.length > 0 && hasCoverage && Boolean(p.phone) };
}

export type ProfileInput = {
  fullName: string;
  phone: string;
  avatarUrl?: string | null | undefined;
  bio?: string | null | undefined;
  yearsExperience: number;
  serviceIds: string[];
  state: string;
  entireState: boolean;
  lgas: string[];
  workStart: string;
  workEnd: string;
  available: boolean;
};

/** Verification status is never editable by the technician. */
export async function saveMyProfile(user: AppUser, input: ProfileInput) {
  const sql = getSql();
  const id = await getTechProfileId(user);
  await sql`update users set full_name = ${input.fullName}, phone = ${input.phone},
            avatar_url = coalesce(${input.avatarUrl ?? null}, avatar_url), updated_at = now() where id = ${user.id}`;
  await sql`update technician_profiles set bio = ${input.bio ?? null}, years_experience = ${input.yearsExperience},
            work_start = ${input.workStart}, work_end = ${input.workEnd},
            available = ${input.available}, updated_at = now() where id = ${id}`;
  await sql`delete from technician_services where technician_id = ${id} and not (service_id = any(${input.serviceIds}::uuid[]))`;
  for (const sid of input.serviceIds) {
    await sql`insert into technician_services (technician_id, service_id) values (${id}, ${sid}) on conflict do nothing`;
  }
  // Coverage is one state: either the whole state or a set of its LGAs.
  await sql`delete from technician_service_areas where technician_id = ${id}`;
  if (input.entireState) {
    await sql`insert into technician_service_areas (technician_id, state, lga, covers_entire_state)
              values (${id}, ${input.state}, null, true)`;
  } else {
    for (const lga of new Set(input.lgas)) {
      await sql`insert into technician_service_areas (technician_id, state, lga, covers_entire_state)
                values (${id}, ${input.state}, ${lga}, false)`;
    }
  }
  return getMyProfile(user);
}

export async function setMyAvailability(user: AppUser, available: boolean) {
  const sql = getSql();
  const id = await getTechProfileId(user);
  await sql`update technician_profiles set available = ${available}, updated_at = now() where id = ${id}`;
  return { available };
}

/** Open offers for this technician. No customer name or phone before acceptance. */
export async function listMyOffers(user: AppUser, requestId?: string): Promise<TechOffer[]> {
  const sql = getSql();
  const id = await getTechProfileId(user);
  return (await sql`
    select r.id, s.name as service_name, r.problem_description, r.device_brand, r.device_model,
           r.area_name, r.address, r.landmark,
           to_char(r.requested_date, 'YYYY-MM-DD') as requested_date,
           to_char(r.availability_start, 'HH24:MI') as availability_start,
           to_char(r.availability_end, 'HH24:MI') as availability_end,
           to_char(o.proposed_date, 'YYYY-MM-DD') as proposed_date,
           to_char(o.proposed_start, 'HH24:MI') as proposed_start,
           to_char(o.proposed_end, 'HH24:MI') as proposed_end,
           s.base_service_fee as service_fee, o.created_at as offered_at, o.status as offer_status
    from request_offers o
    join repair_requests r on r.id = o.repair_request_id
    left join services s on s.id = r.service_id
    join technician_profiles tp on tp.id = o.technician_id
    where o.technician_id = ${id}
      and tp.available = true and tp.verification_status = 'verified'
      and ((o.status = 'offered' and r.status = 'matching')
           or (${requestId ?? null}::uuid is not null and r.id = ${requestId ?? null}::uuid
               and o.status in ('offered', 'accepted')))
      and (${requestId ?? null}::uuid is null or r.id = ${requestId ?? null}::uuid)
    order by o.created_at desc
  `) as TechOffer[];
}

export async function acceptMyOffer(user: AppUser, requestId: string) {
  return acceptOffer(await getTechProfileId(user), requestId);
}

export async function declineMyOffer(user: AppUser, requestId: string) {
  return declineOffer(await getTechProfileId(user), requestId);
}

/** Jobs: accepted requests awaiting payment plus appointments. Contact shown only once accepted. */
export async function listMyJobs(user: AppUser): Promise<TechJob[]> {
  const sql = getSql();
  const id = await getTechProfileId(user);
  return (await sql`
    select ap.id, ap.repair_request_id, ap.status::text as status, ap.payment_status::text as payment_status,
           s.name as service_name, u.full_name as customer_name, u.phone as customer_phone,
           r.address, r.area_name, r.landmark, r.problem_description,
           to_char(ap.appointment_date, 'YYYY-MM-DD') as date,
           to_char(ap.start_time, 'HH24:MI') as start_time, to_char(ap.end_time, 'HH24:MI') as end_time
    from appointments ap
    join users u on u.id = ap.customer_id
    left join services s on s.id = ap.service_id
    left join repair_requests r on r.id = ap.repair_request_id
    where ap.technician_id = ${id} and ap.status <> 'cancelled'
    union all
    select r.id, r.id, 'awaiting_payment', 'unpaid', s.name, u.full_name, u.phone,
           r.address, r.area_name, r.landmark, r.problem_description,
           to_char(r.proposed_date, 'YYYY-MM-DD'), to_char(r.proposed_start, 'HH24:MI'), to_char(r.proposed_end, 'HH24:MI')
    from repair_requests r
    join users u on u.id = r.customer_id
    left join services s on s.id = r.service_id
    where r.matched_technician_id = ${id} and r.status = 'technician_pending'
    order by date, start_time
  `) as TechJob[];
}

const NEXT: Record<string, string> = {
  confirmed: "on_the_way",
  scheduled: "on_the_way",
  on_the_way: "arrived",
  arrived: "in_progress",
  in_progress: "completed",
};

export async function advanceMyJob(user: AppUser, appointmentId: string) {
  const sql = getSql();
  const id = await getTechProfileId(user);
  const rows = (await sql`select status::text as status, repair_request_id from appointments
                          where id = ${appointmentId} and technician_id = ${id}`) as Array<{
    status: string;
    repair_request_id: string | null;
  }>;
  const job = rows[0];
  if (!job) throw new Error("Job not found.");
  const next = NEXT[job.status];
  if (!next) throw new Error("This job can't be updated further.");
  const updated =
    (await sql`update appointments set status = ${next}::appointment_status, updated_at = now()
                             where id = ${appointmentId} and status::text = ${job.status} returning id`) as unknown[];
  if (!updated.length) throw new Error("This job was just updated. Refresh and try again.");
  if (job.repair_request_id) {
    const reqStatus =
      next === "completed" ? "completed" : next === "in_progress" ? "in_progress" : null;
    if (reqStatus) {
      await sql`update repair_requests set status = ${reqStatus}::repair_request_status, updated_at = now()
                where id = ${job.repair_request_id}`;
    }
  }
  if (next === "completed") {
    await sql`update technician_profiles set completed_jobs = completed_jobs + 1 where id = ${id}`;
  }
  return { status: next };
}
