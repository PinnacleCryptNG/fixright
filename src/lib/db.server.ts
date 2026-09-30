import { neon } from "@neondatabase/serverless";

/**
 * Neon PostgreSQL access. Server-only: never import from components.
 * The connection string is read at call time (env is injected per request).
 */
export function getSql() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}
