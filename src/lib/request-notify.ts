/**
 * Browser-side dedupe for technician request notifications.
 * The database stays the source of truth; this only remembers which request IDs
 * a given technician has already been notified about, per technician.
 */
const KEY = (techId: string) => `fixright:notified:${techId}`;
const MAX = 200;

type Store = Pick<Storage, "getItem" | "setItem">;

export function readNotified(store: Store, techId: string): string[] | null {
  try {
    const raw = store.getItem(KEY(techId));
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

/**
 * Returns the IDs that should trigger a browser notification and persists them.
 * On the very first run for a technician the current list is recorded silently,
 * so opening the dashboard never produces a burst of old notifications.
 */
export function takeNewRequestIds(store: Store, techId: string, currentIds: string[]): string[] {
  const seen = readNotified(store, techId);
  const fresh = seen ? currentIds.filter((id) => !seen.includes(id)) : [];
  const next = [...(seen ?? []), ...(seen ? fresh : currentIds)].slice(-MAX);
  try {
    store.setItem(KEY(techId), JSON.stringify(next));
  } catch {
    /* storage unavailable: in-app list still works */
  }
  return fresh;
}

export type NotifyPermission = "unsupported" | "default" | "granted" | "denied";

export function getPermission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifyPermission;
}
