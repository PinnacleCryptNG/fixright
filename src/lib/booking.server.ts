import { getSql } from "./db.server";
import { findAlternatives, findCandidates, isSlotStillFree, slotForTechnician } from "./matching.server";
import type { AppUser, BookingView, CustomerBookings, MatchedTechnician } from "./types";

export type NewRequestInput = {
  serviceId: string;
  problemDescription: string;
  brand?: string | null | undefined;
  model?: string | null | undefined;
  address: string;
  state: string;
  lga: string;
  landmark?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  date: string;
  windowStart: string;
  windowEnd: string;
};

/** Public-safe technician fields only: never phone, email or exact coordinates. */
async function getPublicTechnician(technicianId: string, lga: string | null): Promise<MatchedTechnician> {
  const sql = getSql();
  const rows = (await sql`
    select tp.id, u.full_name, u.avatar_url, tp.rating, tp.completed_jobs, tp.years_experience,
           tp.verification_status, tp.available,
           coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}') as services,
           ${lga}::text as near_area
    from technician_profiles tp
    join users u on u.id = tp.user_id
    left join technician_services ts on ts.technician_id = tp.id
    left join services s on s.id = ts.service_id
    where tp.id = ${technicianId}
    group by tp.id, u.full_name, u.avatar_url
  `) as MatchedTechnician[];
  return rows[0]!;
}

const requestSelect = (sql: ReturnType<typeof getSql>, requestId: string, customerId: string) => sql`
  select r.id, r.status, r.problem_description, r.device_brand, r.device_model, r.address,
         r.area_name, r.state, r.lga, r.landmark,
         to_char(r.requested_date, 'YYYY-MM-DD') as requested_date,
         to_char(r.availability_start, 'HH24:MI') as availability_start,
         to_char(r.availability_end, 'HH24:MI') as availability_end,
         to_char(r.proposed_date, 'YYYY-MM-DD') as proposed_date,
         to_char(r.proposed_start, 'HH24:MI') as proposed_start,
         to_char(r.proposed_end, 'HH24:MI') as proposed_end,
         r.matched_technician_id, s.id as service_id, s.name as service_name,
         s.base_service_fee as service_fee,
         ap.id as appointment_id, ap.payment_status
  from repair_requests r
  left join services s on s.id = r.service_id
  left join appointments ap on ap.repair_request_id = r.id and ap.status <> 'cancelled'
  where r.id = ${requestId} and r.customer_id = ${customerId}
`;

async function loadBooking(requestId: string, customerId: string): Promise<BookingView> {
  const sql = getSql();
  const rows = (await requestSelect(sql, requestId, customerId)) as Array<
    Omit<BookingView, "technician"> & { matched_technician_id: string | null }
  >;
  const row = rows[0];
  if (!row) throw new Response("Not found", { status: 404 });
  const { matched_technician_id, ...rest } = row;
  const technician = matched_technician_id
    ? await getPublicTechnician(matched_technician_id, row.lga ?? null)
    : null;
  const open = (await sql`select count(*)::int as n from request_offers
                          where repair_request_id = ${requestId} and status = 'offered'`) as Array<{ n: number }>;
  const waiting = !technician && rest.status === "matching" && open[0]!.n > 0;
  const alternatives =
    !technician && !waiting && rest.status === "matching" && rest.service_id && rest.requested_date
      ? await findAlternatives({
          serviceId: rest.service_id,
          state: rest.state ?? "",
          lga: rest.lga ?? "",
          date: rest.requested_date,
          windowStart: rest.availability_start ?? "08:00",
          windowEnd: rest.availability_end ?? "18:00",
        })
      : [];
  return { ...rest, technician, alternatives, waiting };
}

/**
 * Offers the request to every eligible technician who hasn't seen it yet.
 * Demo technicians have no login, so when only demo technicians are eligible
 * the best-ranked one accepts on their behalf (keeps the demo usable).
 */
export async function dispatchRequest(requestId: string) {
  const sql = getSql();
  const rows = (await sql`
    select service_id, state, lga, status, matched_technician_id,
           to_char(requested_date, 'YYYY-MM-DD') as d,
           to_char(availability_start, 'HH24:MI') as s, to_char(availability_end, 'HH24:MI') as e,
           coalesce((select array_agg(technician_id) from request_offers where repair_request_id = r.id), '{}') as seen
    from repair_requests r where id = ${requestId}
  `) as Array<{ service_id: string; state: string; lga: string; status: string; matched_technician_id: string | null; d: string; s: string; e: string; seen: string[] }>;
  const r = rows[0];
  if (!r || r.status !== "matching" || r.matched_technician_id) return;

  const candidates = await findCandidates({
    serviceId: r.service_id, state: r.state, lga: r.lga, date: r.d, windowStart: r.s, windowEnd: r.e,
    excludeTechnicianIds: r.seen, ignoreRequestId: requestId,
  });
  if (!candidates.length) return;

  for (const c of candidates) {
    await sql`
      insert into request_offers (repair_request_id, technician_id, proposed_date, proposed_start, proposed_end)
      values (${requestId}, ${c.technicianId}, ${c.proposedDate}, ${c.proposedStart}, ${c.proposedEnd})
      on conflict (repair_request_id, technician_id) do nothing
    `;
  }

  const withLogin = (await sql`
    select count(*)::int as n from technician_profiles tp join users u on u.id = tp.user_id
    where tp.id = any(${candidates.map((c) => c.technicianId)}::uuid[]) and u.clerk_user_id is not null
  `) as Array<{ n: number }>;
  if (withLogin[0]!.n === 0) {
    await acceptOffer(candidates[0]!.technicianId, requestId).catch(() => undefined);
  }
}

export const ALREADY_ACCEPTED = "This request has already been accepted by another technician.";

/** Atomic claim: only one technician can move a request out of `matching`. */
export async function acceptOffer(technicianId: string, requestId: string) {
  const sql = getSql();
  const offers = (await sql`
    select o.status, to_char(o.proposed_date, 'YYYY-MM-DD') as d,
           to_char(o.proposed_start, 'HH24:MI') as s, to_char(o.proposed_end, 'HH24:MI') as e,
           to_char(greatest(tp.work_start, r.availability_start), 'HH24:MI') as ws,
           to_char(least(tp.work_end, r.availability_end), 'HH24:MI') as we,
           r.status as request_status, r.matched_technician_id, tp.verification_status as vs
    from request_offers o
    join repair_requests r on r.id = o.repair_request_id
    join technician_profiles tp on tp.id = o.technician_id
    where o.repair_request_id = ${requestId} and o.technician_id = ${technicianId}
  `) as Array<{ status: string; d: string; s: string; e: string; ws: string; we: string; request_status: string; matched_technician_id: string | null; vs: string }>;
  const o = offers[0];
  if (!o) throw new Error("This request isn't available to you.");
  if (o.vs !== "verified") throw new Error("Only verified technicians can accept requests.");
  if (o.matched_technician_id && o.matched_technician_id !== technicianId) throw new Error(ALREADY_ACCEPTED);
  if (o.matched_technician_id === technicianId) return { ok: true };
  if (o.status !== "offered" || o.request_status !== "matching") {
    throw new Error(o.status === "withdrawn" ? ALREADY_ACCEPTED : "This request is no longer available.");
  }

  let slot = { start: o.s, end: o.e };
  if (!(await isSlotStillFree(technicianId, o.d, o.s, o.e, requestId))) {
    const next = await slotForTechnician(technicianId, o.d, o.ws, o.we, requestId);
    if (!next) throw new Error("You're no longer free during the customer's availability window.");
    slot = next;
  }

  const claimed = (await sql`
    update repair_requests set
      matched_technician_id = ${technicianId}, status = 'technician_pending',
      proposed_date = ${o.d}, proposed_start = ${slot.start}, proposed_end = ${slot.end}, updated_at = now()
    where id = ${requestId} and status = 'matching' and matched_technician_id is null
    returning id
  `) as unknown[];
  if (!claimed.length) {
    await sql`update request_offers set status = 'withdrawn' where repair_request_id = ${requestId}
              and technician_id = ${technicianId} and status = 'offered'`;
    throw new Error(ALREADY_ACCEPTED);
  }
  await sql`update request_offers set status = 'accepted', responded_at = now(),
            proposed_start = ${slot.start}, proposed_end = ${slot.end}
            where repair_request_id = ${requestId} and technician_id = ${technicianId}`;
  await sql`update request_offers set status = 'withdrawn' where repair_request_id = ${requestId}
            and technician_id <> ${technicianId} and status = 'offered'`;
  return { ok: true };
}

/** Declining removes the technician; if nobody is left, re-dispatch to new candidates. */
export async function declineOffer(technicianId: string, requestId: string) {
  const sql = getSql();
  await sql`update request_offers set status = 'declined', responded_at = now()
            where repair_request_id = ${requestId} and technician_id = ${technicianId} and status = 'offered'`;
  const open = (await sql`select count(*)::int as n from request_offers
                          where repair_request_id = ${requestId} and status = 'offered'`) as Array<{ n: number }>;
  if (open[0]!.n === 0) await dispatchRequest(requestId);
  return { ok: true };
}

export async function createRepairRequest(user: AppUser, input: NewRequestInput): Promise<BookingView> {
  const sql = getSql();
  const inserted = (await sql`
    insert into repair_requests (
      customer_id, service_id, problem_description, device_brand, device_model,
      address, area_name, state, lga, landmark, latitude, longitude,
      requested_date, availability_start, availability_end, status
    ) values (
      ${user.id}, ${input.serviceId}, ${input.problemDescription}, ${input.brand ?? null}, ${input.model ?? null},
      ${input.address}, ${`${input.lga}, ${input.state}`}, ${input.state}, ${input.lga}, ${input.landmark ?? null}, ${input.latitude ?? null}, ${input.longitude ?? null},
      ${input.date}, ${input.windowStart}, ${input.windowEnd}, 'matching'
    ) returning id
  `) as Array<{ id: string }>;
  const id = inserted[0]!.id;
  await dispatchRequest(id);
  return loadBooking(id, user.id);
}

export async function getBooking(user: AppUser, requestId: string) {
  return loadBooking(requestId, user.id);
}

/**
 * Demo payment + confirmation. Only reachable after a technician was matched
 * (status technician_pending). Payment is simulated: it is recorded as paid and
 * the appointment is created confirmed in the same step — never before.
 */
export async function confirmBooking(user: AppUser, requestId: string): Promise<BookingView> {
  const sql = getSql();
  const rows = (await sql`
    select r.status, r.matched_technician_id, r.service_id,
           to_char(r.proposed_date, 'YYYY-MM-DD') as d,
           to_char(r.proposed_start, 'HH24:MI') as s, to_char(r.proposed_end, 'HH24:MI') as e,
           s.base_service_fee as fee
    from repair_requests r left join services s on s.id = r.service_id
    where r.id = ${requestId} and r.customer_id = ${user.id}
  `) as Array<{ status: string; matched_technician_id: string | null; service_id: string; d: string; s: string; e: string; fee: string }>;
  const r = rows[0];
  if (!r) throw new Response("Not found", { status: 404 });
  if (r.status === "confirmed") return loadBooking(requestId, user.id);
  if (r.status !== "technician_pending" || !r.matched_technician_id) {
    throw new Error("This request has no technician waiting for confirmation.");
  }

  if (!(await isSlotStillFree(r.matched_technician_id, r.d, r.s, r.e, requestId))) {
    // Slot was taken meanwhile: look for another slot/technician instead of double-booking.
    await sql`update repair_requests set status = 'matching', matched_technician_id = null,
              proposed_date = null, proposed_start = null, proposed_end = null where id = ${requestId}`;
    await dispatchRequest(requestId);
    throw new Error("That time was just taken. We've found you a new proposal — please review it.");
  }

  await sql`
    insert into appointments (repair_request_id, customer_id, technician_id, service_id,
      appointment_date, start_time, end_time, status, payment_status, service_fee)
    values (${requestId}, ${user.id}, ${r.matched_technician_id}, ${r.service_id},
      ${r.d}, ${r.s}, ${r.e}, 'confirmed', 'paid', ${r.fee ?? 1000})
  `;
  await sql`update repair_requests set status = 'confirmed', updated_at = now() where id = ${requestId}`;
  return loadBooking(requestId, user.id);
}

/** Customer chose "Change request": the unconfirmed request is cancelled. */
export async function cancelUnconfirmedRequest(user: AppUser, requestId: string) {
  const sql = getSql();
  await sql`
    update repair_requests set status = 'cancelled', updated_at = now()
    where id = ${requestId} and customer_id = ${user.id}
      and status in ('submitted', 'matching', 'technician_pending')
  `;
  await sql`update request_offers set status = 'withdrawn'
            where repair_request_id = ${requestId} and status = 'offered'`;
  return { ok: true };
}

export async function listCustomerBookings(user: AppUser): Promise<CustomerBookings> {
  const sql = getSql();
  const upcoming = (await sql`
    select ap.id, ap.repair_request_id, ap.status, ap.payment_status, ap.service_fee,
           to_char(ap.appointment_date, 'YYYY-MM-DD') as appointment_date,
           to_char(ap.start_time, 'HH24:MI') as start_time, to_char(ap.end_time, 'HH24:MI') as end_time,
           s.name as service_name, u.full_name as technician_name, r.address, r.area_name
    from appointments ap
    join technician_profiles tp on tp.id = ap.technician_id
    join users u on u.id = tp.user_id
    left join services s on s.id = ap.service_id
    left join repair_requests r on r.id = ap.repair_request_id
    where ap.customer_id = ${user.id}
      and ap.status in ('scheduled', 'confirmed', 'on_the_way', 'arrived', 'in_progress')
      and ap.appointment_date >= current_date
    order by ap.appointment_date, ap.start_time
  `) as CustomerBookings["upcoming"];
  const requests = (await sql`
    select r.id, r.status, r.problem_description, s.name as service_name, r.created_at,
           to_char(r.requested_date, 'YYYY-MM-DD') as requested_date,
           (r.matched_technician_id is not null) as has_technician,
           exists (select 1 from request_offers o where o.repair_request_id = r.id and o.status = 'offered') as waiting
    from repair_requests r left join services s on s.id = r.service_id
    where r.customer_id = ${user.id}
    order by r.created_at desc limit 10
  `) as CustomerBookings["requests"];
  return { upcoming, requests };
}
