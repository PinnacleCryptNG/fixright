/**
 * Lightweight in-memory rate limiter (per server instance). Not a global
 * guarantee across instances, but it blunts scripted abuse of the costliest
 * actions without new infrastructure. Never used on the Paystack webhook.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    throw new Error("You're doing that too often. Please wait a minute and try again.");
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
}
