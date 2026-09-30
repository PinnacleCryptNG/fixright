import { getRequest } from "@tanstack/react-start/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verifies the Clerk session token on the request using Clerk's public JWKS.
 * No Clerk secret key is required for verification.
 */

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getIssuer() {
  const issuer = process.env["CLERK_ISSUER_URL"];
  if (!issuer) throw new Error("CLERK_ISSUER_URL is not configured");
  return issuer.replace(/\/$/, "");
}

function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${getIssuer()}/.well-known/jwks.json`));
  return jwks;
}

export type VerifiedIdentity = {
  clerkUserId: string;
  email: string | null;
};

export async function getVerifiedIdentity(): Promise<VerifiedIdentity | null> {
  const header = getRequest().headers.get("authorization");
  const token = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwks(), { issuer: getIssuer() });
    const clerkUserId = typeof payload.sub === "string" ? payload.sub : null;
    if (!clerkUserId) return null;

    const claimEmail =
      typeof (payload as Record<string, unknown>)["email"] === "string"
        ? ((payload as Record<string, unknown>)["email"] as string)
        : null;

    const email = claimEmail ?? (await fetchClerkEmail(clerkUserId));
    return { clerkUserId, email };
  } catch {
    return null;
  }
}

export async function requireIdentity(): Promise<VerifiedIdentity> {
  const identity = await getVerifiedIdentity();
  if (!identity) throw new Response("Unauthorized", { status: 401 });
  return identity;
}

/**
 * Optional enrichment: when a Clerk secret key is configured we read the
 * verified primary email from Clerk's Backend API. Without it we fall back to
 * the session-token claim.
 */
async function fetchClerkEmail(clerkUserId: string): Promise<string | null> {
  const secret = process.env["CLERK_SECRET_KEY"];
  if (!secret) return null;
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as {
      primary_email_address_id?: string;
      email_addresses?: Array<{ id: string; email_address: string }>;
    };
    const list = user.email_addresses ?? [];
    const primary = list.find((e) => e.id === user.primary_email_address_id) ?? list[0];
    return primary?.email_address ?? null;
  } catch {
    return null;
  }
}
