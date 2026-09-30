import { getSql } from "./db.server";
import { findMatch, isSlotStillFree } from "./matching.server";
import type { AppUser, BookingView, CustomerBookings, MatchedTechnician } from "./types";

export type NewRequestInput = {
  serviceId: string;
  problemDescription: string;
  brand?: string | null | undefined;
  model?: string | null | undefined;
  address: string;
  areaName: string;
  landmark?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  date: string;
  windowStart: string;
  windowEnd: string;
};

/** Public-safe technician fields only: never phone, email or exact coordinates. */
async function getPublicTechnician(technicianId: string, areaName: string): Promise<MatchedTechnician> {
  const sql = getSql();
  const rows = (await sql`
    select tp.id, u.full_name, u.avatar_url, tp.rating, tp.completed_jobs, tp.years_experience,
           tp.verification_status, tp.available,
           coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}') as services,
           (select a.area_name from technician_service_areas a
             where a.technician_id = tp.id and lower(a.area_name) = lower(${areaName}) limit 1) as near_area
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
         r.area_name, r.landmark,
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
    ? await getPublicTechnician(matched_technician_id, row.area_name ?? "")
    : null;
  return { ...rest, technician };
}

async function runMatching(requestId: string, customerId: string, exclude: string[] = []) {
  const sql = getSql();
  const rows = (await sql`
    select service_id, area_name, to_char(requested_date, 'YYYY-MM-DD') as d,
           to_char(availability_start, 'HH24:MI') as s, to_char(availability_end, 'HH24:MI') as e
    from repair_requests where id = ${requestId} and customer_id = ${customerId}
  `) as Array<{ service_id: string; area_name: string; d: string; s: string; e: string }>;
  const r = rows[0];
  if (!r) throw new Response("Not found", { status: 404 });

  const match = await findMatch({
    serviceId: r.service_id,
    areaName: r.area_name,
    date: r.d,
    windowStart: r.s,
    windowEnd: r.e,
    excludeTechnicianIds: exclude,
  });

  if (match) {
    await sql`
      update repair_requests set
        matched_technician_id = ${match.technicianId}, status = 'technician_pending',
        proposed_date = ${match.proposedDate}, proposed_start = ${match.proposedStart},
        proposed_end = ${match.proposedEnd}, updated_at = now()
      where id = ${requestId}
    `;
  }
}

export async function createRepairRequest(user: AppUser, input: NewRequestInput): Promise<BookingView> {
  const sql = getSql();
  const inserted = (await sql`
    insert into repair_requests (
      customer_id, service_id, problem_description, device_brand, device_model,
      address, area_name, landmark, latitude, longitude,
      requested_date, availability_start, availability_end, status
    ) values (
      ${user.id}, ${input.serviceId}, ${input.problemDescription}, ${input.brand ?? null}, ${input.model ?? null},
      ${input.address}, ${input.areaName}, ${input.landmark ?? null}, ${input.latitude ?? null}, ${input.longitude ?? null},
      ${input.date}, ${input.windowStart}, ${input.windowEnd}, 'matching'
    ) returning id
  `) as Array<{ id: string }>;
  const id = inserted[0]!.id;
  await runMatching(id, user.id);
  return loadBooking(id, user.id);
}

export async function getBooking(user: AppUser, requestId: string) {
  return loadBooking(requestId, user.id);
}

/** Creates the appointment only after the customer confirms the matched technician. */
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

  if (!(await isSlotStillFree(r.matched_technician_id, r.d, r.s, r.e))) {
    // Slot was taken meanwhile: look for another slot/technician instead of double-booking.
    await sql`update repair_requests set status = 'matching', matched_technician_id = null,
              proposed_date = null, proposed_start = null, proposed_end = null where id = ${requestId}`;
    await runMatching(requestId, user.id);
    throw new Error("That time was just taken. We've found you a new proposal — please review it.");
  }

  await sql`
    insert into appointments (repair_request_id, customer_id, technician_id, service_id,
      appointment_date, start_time, end_time, status, payment_status, service_fee)
    values (${requestId}, ${user.id}, ${r.matched_technician_id}, ${r.service_id},
      ${r.d}, ${r.s}, ${r.e}, 'scheduled', 'pending', ${r.fee ?? 1000})
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
      and ap.status in ('scheduled', 'in_progress')
      and ap.appointment_date >= current_date
    order by ap.appointment_date, ap.start_time
  `) as CustomerBookings["upcoming"];
  const requests = (await sql`
    select r.id, r.status, r.problem_description, s.name as service_name, r.created_at,
           to_char(r.requested_date, 'YYYY-MM-DD') as requested_date
    from repair_requests r left join services s on s.id = r.service_id
    where r.customer_id = ${user.id}
    order by r.created_at desc limit 10
  `) as CustomerBookings["requests"];
  return { upcoming, requests };
}

export async function listBookableAreas(): Promise<string[]> {
  const sql = getSql();
  const rows = (await sql`
    select distinct a.area_name from technician_service_areas a
    join technician_profiles tp on tp.id = a.technician_id
    where tp.verification_status = 'verified' order by a.area_name
  `) as Array<{ area_name: string }>;
  return rows.map((r) => r.area_name);
}
