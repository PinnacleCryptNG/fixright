import { getSql } from "./db.server";

/**
 * FixRight technician matching (v2).
 *
 * Eligibility, applied in SQL:
 *  1. technician is verified
 *  2. technician is available (accepting jobs)
 *  3. technician offers the requested service
 *  4. technician covers the customer's area
 *  5. technician's working hours overlap the customer's window
 *  6. technician has no overlapping appointment or held (accepted, unpaid) slot
 *
 * Candidates are ranked by rating then completed jobs. Each candidate's slot is
 * the earliest free one-hour slot inside (customer window ∩ working hours).
 * Replace this module (e.g. distance-based ranking) without touching callers.
 */

export type MatchInput = {
  serviceId: string;
  areaName: string;
  date: string; // YYYY-MM-DD
  windowStart: string; // HH:MM
  windowEnd: string; // HH:MM
  excludeTechnicianIds?: string[];
  /** Ignore this request's own held slot when checking conflicts. */
  ignoreRequestId?: string | null;
};

export type MatchResult = {
  technicianId: string;
  proposedDate: string;
  proposedStart: string;
  proposedEnd: string;
};

const SLOT_MINUTES = 60;
const BUSY_APPT = ["scheduled", "confirmed", "on_the_way", "arrived", "in_progress"];

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const toTime = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

async function busySlots(technicianId: string, date: string, ignoreRequestId: string | null) {
  const sql = getSql();
  return (await sql`
    select to_char(start_time, 'HH24:MI') as s, to_char(end_time, 'HH24:MI') as e
    from appointments
    where technician_id = ${technicianId} and appointment_date = ${date}
      and status::text = any(${BUSY_APPT})
    union all
    select to_char(proposed_start, 'HH24:MI'), to_char(proposed_end, 'HH24:MI')
    from repair_requests
    where matched_technician_id = ${technicianId} and proposed_date = ${date}
      and status = 'technician_pending'
      and (${ignoreRequestId}::uuid is null or id <> ${ignoreRequestId}::uuid)
  `) as Array<{ s: string | null; e: string | null }>;
}

/** Earliest free one-hour slot for one technician, or null. */
export async function slotForTechnician(
  technicianId: string,
  date: string,
  windowStart: string,
  windowEnd: string,
  ignoreRequestId: string | null = null,
): Promise<{ start: string; end: string } | null> {
  const busy = await busySlots(technicianId, date, ignoreRequestId);
  const startMin = toMinutes(windowStart);
  const endMin = toMinutes(windowEnd);
  for (let s = startMin; s + SLOT_MINUTES <= endMin; s += 30) {
    const e = s + SLOT_MINUTES;
    const clash = busy.some((b) => b.s && b.e && s < toMinutes(b.e) && toMinutes(b.s) < e);
    if (!clash) return { start: toTime(s), end: toTime(e) };
  }
  return null;
}

/** Every eligible technician with their proposed slot, best-ranked first. */
export async function findCandidates(input: MatchInput): Promise<MatchResult[]> {
  const sql = getSql();
  const exclude = input.excludeTechnicianIds ?? [];
  const candidates = (await sql`
    select tp.id,
           to_char(greatest(tp.work_start, ${input.windowStart}::time), 'HH24:MI') as ws,
           to_char(least(tp.work_end, ${input.windowEnd}::time), 'HH24:MI') as we
    from technician_profiles tp
    where tp.verification_status = 'verified'
      and tp.available = true
      and exists (select 1 from technician_services ts
                  where ts.technician_id = tp.id and ts.service_id = ${input.serviceId})
      and exists (select 1 from technician_service_areas a
                  where a.technician_id = tp.id and lower(a.area_name) = lower(${input.areaName}))
      and not (tp.id = any(${exclude}::uuid[]))
      and greatest(tp.work_start, ${input.windowStart}::time) < least(tp.work_end, ${input.windowEnd}::time)
    order by tp.rating desc, tp.completed_jobs desc
  `) as Array<{ id: string; ws: string; we: string }>;

  const out: MatchResult[] = [];
  for (const c of candidates) {
    const slot = await slotForTechnician(c.id, input.date, c.ws, c.we, input.ignoreRequestId ?? null);
    if (slot) {
      out.push({ technicianId: c.id, proposedDate: input.date, proposedStart: slot.start, proposedEnd: slot.end });
    }
  }
  return out;
}

export async function findMatch(input: MatchInput): Promise<MatchResult | null> {
  return (await findCandidates(input))[0] ?? null;
}

/** Re-checks a single technician/slot right before an appointment is created. */
export async function isSlotStillFree(
  technicianId: string,
  date: string,
  start: string,
  end: string,
  ignoreRequestId: string | null = null,
) {
  const busy = await busySlots(technicianId, date, ignoreRequestId);
  const s = toMinutes(start);
  const e = toMinutes(end);
  return !busy.some((b) => b.s && b.e && s < toMinutes(b.e) && toMinutes(b.s) < e);
}

/**
 * Suggests up to 3 alternative one-hour slots (same window on the next few days,
 * then the whole working day) where an eligible technician is free.
 */
export async function findAlternatives(input: Omit<MatchInput, "excludeTechnicianIds">) {
  const out: Array<{ date: string; start: string; end: string }> = [];
  const base = new Date(`${input.date}T00:00:00Z`);
  const tries: Array<{ date: string; s: string; e: string }> = [];
  for (let d = 0; d <= 3; d++) {
    const date = new Date(base.getTime() + d * 86400_000).toISOString().slice(0, 10);
    if (d > 0) tries.push({ date, s: input.windowStart, e: input.windowEnd });
    tries.push({ date, s: "08:00", e: "18:00" });
  }
  const seen = new Set<string>();
  for (const t of tries) {
    if (out.length >= 3) break;
    const m = await findMatch({ ...input, date: t.date, windowStart: t.s, windowEnd: t.e });
    if (!m || seen.has(m.proposedDate)) continue;
    seen.add(m.proposedDate);
    out.push({ date: m.proposedDate, start: m.proposedStart, end: m.proposedEnd });
  }
  return out;
}
