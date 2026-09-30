import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import type { ReactNode } from "react";

import { techKeys, useOfferActions } from "@/components/technician/tech-ui";
import { Button } from "@/components/ui/button";
import { getMyOffer } from "@/lib/fixright.functions";
import { SERVICE_FEE_NOTE } from "@/lib/config";
import { formatNaira, formatSlot, formatTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/technician/requests/$requestId")({
  head: () => ({
    meta: [
      { title: "Repair request — FixRight technician" },
      { name: "description", content: "Details of a customer repair request." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequestDetail,
});

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1.5 text-sm">{children}</div>
    </div>
  );
}

function RequestDetail() {
  const { requestId } = Route.useParams();
  const fetchOffer = useServerFn(getMyOffer);
  const q = useQuery({ queryKey: [...techKeys.offers, requestId], queryFn: () => fetchOffer({ data: { requestId } }) });
  const { acceptM, declineM, busy } = useOfferActions(() => void q.refetch());
  const o = q.data;

  return (
    <div className="max-w-2xl">
      <Link to="/technician/requests" className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Requests
      </Link>
      {q.isLoading ? (
        <div className="h-64 animate-pulse rounded-lg border border-border bg-muted" />
      ) : !o ? (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">This request isn't available to you.</div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Repair request</h1>
          {o.offer_status !== "offered" ? (
            <p className="mt-3 rounded-md border border-border bg-muted p-3 text-sm">
              {o.offer_status === "accepted"
                ? "You accepted this request. It moves to My Jobs once the customer pays the service call."
                : o.offer_status === "declined"
                  ? "You declined this request."
                  : "This request has already been accepted by another technician."}
            </p>
          ) : null}
          <div className="mt-6 divide-y divide-border rounded-lg border border-border bg-card shadow-card">
            <Block label="Service"><span className="text-base font-semibold">{o.service_name}</span>{o.device_brand ? ` · ${o.device_brand} ${o.device_model ?? ""}` : ""}</Block>
            <Block label="Problem"><p className="leading-relaxed">“{o.problem_description}”</p></Block>
            <Block label="Location">
              <p className="flex items-center gap-2 font-medium"><MapPin className="h-4 w-4 text-primary" />{o.area_name}</p>
              <p className="mt-1 text-muted-foreground">{o.address}{o.landmark ? ` · ${o.landmark}` : ""}</p>
            </Block>
            <Block label="Customer availability">
              {formatSlot(o.requested_date)} · {formatTime(o.availability_start)} – {formatTime(o.availability_end)}
            </Block>
            <Block label="Proposed appointment">
              <p className="flex items-center gap-2 text-base font-semibold">
                <CalendarDays className="h-4 w-4 text-primary" />{formatTime(o.proposed_start)} – {formatTime(o.proposed_end)}
              </p>
              <p className="mt-1 text-muted-foreground">This appointment fits within the customer's requested availability window.</p>
            </Block>
            <Block label="Service call">
              <span className="text-base font-semibold">{formatNaira(o.service_fee)}</span>
              <p className="mt-1 text-xs text-muted-foreground">{SERVICE_FEE_NOTE}</p>
            </Block>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">The customer's name and phone number are shared once you accept.</p>
          {o.offer_status === "offered" ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button size="lg" disabled={busy} onClick={() => acceptM.mutate(o.id)}>Accept Request</Button>
              <Button size="lg" variant="outline" disabled={busy} onClick={() => declineM.mutate(o.id)}>Decline</Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
