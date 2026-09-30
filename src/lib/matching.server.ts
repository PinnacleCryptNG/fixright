import { getSql } from "./db.server";

/**
 * FixRight technician matching (v1).
 *
 * Rules, applied in SQL:
 *  1. technician is verified
 *  2. technician is available
 *  3. technician offers the requested service
 *  4. technician covers the customer's area
 *  5. technician has no conflicting appointment in the proposed slot
 *
 * Candidates are ranked by rating then completed jobs. The proposed slot is the
 * earliest free one-hour slot inside the customer's availability window.
 * Replace this module (e.g. distance-based ranking with Google Maps) without
 * touching callers — they only depend on `findMatch`.
 */

export type MatchInput = {
  serviceId: string;
  areaName: string;
  date: string; // YYYY-MM-DD
  windowStart: string; // HH:MM
  windowEnd: string; // HH:MM
  excludeTechnicianIds?: string[];
};

export type MatchResult = {
  technicianId: string;
  proposedDate: string;
  proposedStart: string;
  proposedEnd: string;
};

const SLOT_MINUTES = 60;

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const toTime = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

export async function findMatch(input: MatchInput): Promise<MatchResult | null> {
  const sql = getSql();
  const exclude = input.excludeTechnicianIds ?? [];

  const candidates = (await sql`
    select tp.id
    from technician_profiles tp
    where tp.verification_status = 'verified'
      and tp.available = true
      and exists (select 1 from technician_services ts
                  where ts.technician_id = tp.id and ts.service_id = ${input.serviceId})
      and exists (select 1 from technician_service_areas a
                  where a.technician_id = tp.id and lower(a.area_name) = lower(${input.areaName}))
      and not (tp.id = any(${exclude}::uuid[]))
    order by tp.rating desc, tp.completed_jobs desc
  `) as Array<{ id: string }>;

  const startMin = toMinutes(input.windowStart);
  const endMin = toMinutes(input.windowEnd);

  for (const c of candidates) {
    const busy = (await sql`
      select to_char(start_time, 'HH24:MI') as s, to_char(end_time, 'HH24:MI') as e
      from appointments
      where technician_id = ${c.id}
        and appointment_date = ${input.date}
        and status in ('scheduled', 'confirmed', 'in_progress')
    `) as Array<{ s: string | null; e: string | null }>;

    for (let s = startMin; s + SLOT_MINUTES <= endMin; s += 30) {
      const e = s + SLOT_MINUTES;
      const clash = busy.some(
        (b) => b.s && b.e && s < toMinutes(b.e) && toMinutes(b.s) < e,
      );
      if (!clash) {
        return {
          technicianId: c.id,
          proposedDate: input.date,
          proposedStart: toTime(s),
          proposedEnd: toTime(e),
        };
      }
    }
  }
  return null;
}

/** Re-checks a single technician/slot right before an appointment is created. */
export async function isSlotStillFree(technicianId: string, date: string, start: string, end: string) {
  const sql = getSql();
  const rows = (await sql`
    select 1 from appointments
    where technician_id = ${technicianId}
      and appointment_date = ${date}
      and status in ('scheduled', 'confirmed', 'in_progress')
      and start_time < ${end}::time and end_time > ${start}::time
    limit 1
  `) as unknown[];
  return rows.length === 0;
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
    if (!m) continue;
    const key = `${m.proposedDate}-${m.proposedStart}`;
    if (seen.has(key) || seen.has(m.proposedDate)) continue;
    seen.add(key); seen.add(m.proposedDate);
    out.push({ date: m.proposedDate, start: m.proposedStart, end: m.proposedEnd });
  }
  return out;
}
