/** Browser-safe display helpers for dates, times and naira amounts. */

export function formatTime(t: string | null | undefined) {
  if (!t) return "";
  const [hs, ms] = t.split(":");
  const h = Number(hs);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${ms ?? "00"} ${suffix}`;
}

export function todayLocalISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function formatDay(date: string | null | undefined) {
  if (!date) return "";
  const today = todayLocalISO();
  const tomorrow = new Date(`${today}T00:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  if (date === today) return "Today";
  if (date === tomorrowISO) return "Tomorrow";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatSlot(date: string | null | undefined, start?: string | null, end?: string | null) {
  const day = formatDay(date);
  if (!start || !end) return day;
  return `${day} · ${formatTime(start)} – ${formatTime(end)}`;
}

export function formatNaira(amount: string | number | null | undefined) {
  const n = Number(amount ?? 0);
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}
