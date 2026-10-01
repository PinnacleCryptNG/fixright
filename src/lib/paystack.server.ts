/**
 * Paystack server-side helper. The secret key is read inside each function
 * (never at module scope) and never leaves the server.
 */

const API = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env["PAYSTACK_SECRET_KEY"];
  if (!key) throw new Error("Payments aren't configured yet. Please try again later.");
  return key;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => null)) as { status?: boolean; message?: string } & T | null;
  if (!res.ok || !body || body.status === false) {
    throw new Error("We couldn't reach the payment service. Please try again.");
  }
  return body;
}

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
}): Promise<{ authorizationUrl: string; reference: string }> {
  const data = await call<{ data: { authorization_url: string; reference: string } }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
    }),
  });
  return { authorizationUrl: data.data.authorization_url, reference: data.data.reference };
}

export type VerifiedTransaction = {
  status: string;
  reference: string;
  amount: number; // kobo
  currency: string;
  paid_at: string | null;
};

export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  const data = await call<{ data: VerifiedTransaction }>(`/transaction/verify/${encodeURIComponent(reference)}`);
  return data.data;
}
