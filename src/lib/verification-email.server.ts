import { getSql } from "./db.server";

/**
 * Sends the one-time verification decision email to a real technician.
 * Delivery failures are logged and never undo the admin decision.
 * The (technician_id, status) primary key in verification_emails guarantees
 * each decision email is attempted at most once.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

type Decision = "verified" | "rejected";

const COPY: Record<Decision, { subject: string; heading: string; body: string }> = {
  verified: {
    subject: "Your FixRight technician account has been verified",
    heading: "You're verified",
    body: "Good news — your FixRight technician account has been verified. You can now receive repair requests from customers in your service area. Turn on availability in your technician dashboard to start receiving requests.",
  },
  rejected: {
    subject: "Update on your FixRight technician application",
    heading: "Update on your application",
    body: "Thank you for applying to join FixRight as a technician. After reviewing your application, we're unable to approve it at this time. You won't receive repair requests while your application is not approved.",
  },
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function render(name: string | null, d: Decision) {
  const c = COPY[d];
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#17211D">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="font-size:20px;font-weight:700;margin:0 0 24px">Fix<span style="color:#176B52">Right</span></p>
<h1 style="font-size:20px;margin:0 0 16px">${c.heading}</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 12px">${greeting}</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px">${c.body}</p>
<p style="font-size:13px;color:#737A75;margin:0">— The FixRight team</p>
</div></body></html>`;
}

export async function sendVerificationEmail(technicianId: string, decision: Decision) {
  const sql = getSql();
  try {
    const rows = (await sql`
      select u.email, u.full_name, u.is_demo from technician_profiles tp
      join users u on u.id = tp.user_id where tp.id = ${technicianId}
    `) as Array<{ email: string | null; full_name: string | null; is_demo: boolean }>;
    const t = rows[0];
    if (!t || t.is_demo || !t.email) return;

    // Claim the send; a second attempt for the same decision does nothing.
    const claimed = await sql`
      insert into verification_emails (technician_id, status) values (${technicianId}, ${decision}::verification_status)
      on conflict do nothing returning technician_id`;
    if (claimed.length === 0) return;

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const resendKey = process.env["RESEND_API_KEY"];
    if (!lovableKey || !resendKey) {
      console.error("[verification-email] email provider not configured");
      return;
    }
    const from = process.env["FIXRIGHT_EMAIL_FROM"] ?? "FixRight <noreply@fixright.online>";
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from,
        to: [t.email],
        subject: COPY[decision].subject,
        html: render(t.full_name, decision),
      }),
    });
    if (!res.ok) {
      console.error(`[verification-email] send failed [${res.status}]: ${await res.text()}`);
      return;
    }
    await sql`update verification_emails set sent_at = now()
              where technician_id = ${technicianId} and status = ${decision}::verification_status`;
  } catch (e) {
    console.error("[verification-email] error", e instanceof Error ? e.message : e);
  }
}
