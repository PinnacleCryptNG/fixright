import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, CalendarDays, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  acceptRequest,
  declineRequest,
  getMyTechProfile,
  setMyAvailability,
} from "@/lib/fixright.functions";
import { formatNaira, formatSlot, formatTime } from "@/lib/format";
import type { TechOffer, VerificationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const techKeys = {
  profile: ["tech-profile"] as const,
  offers: ["tech-offers"] as const,
  jobs: ["tech-jobs"] as const,
};

export function useTechProfile() {
  const fetchProfile = useServerFn(getMyTechProfile);
  return useQuery({ queryKey: techKeys.profile, queryFn: () => fetchProfile() });
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
        <BadgeCheck className="h-3.5 w-3.5" /> Verified technician
      </span>
    );
  }
  const label = status === "pending" ? "Verification pending" : status === "rejected" ? "Verification rejected" : "Account suspended";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      <Clock className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

export function AvailabilityToggle() {
  const { data: profile } = useTechProfile();
  const qc = useQueryClient();
  const setAvail = useServerFn(setMyAvailability);
  const m = useMutation({
    mutationFn: (available: boolean) => setAvail({ data: { available } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: techKeys.profile });
      void qc.invalidateQueries({ queryKey: techKeys.offers });
    },
    onError: () => toast.error("Couldn't update your availability."),
  });
  if (!profile) return <div className="h-20 animate-pulse rounded-lg border border-border bg-muted" />;
  const on = m.isPending ? Boolean(m.variables) : profile.available;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border p-5 shadow-card transition-colors",
        on ? "border-primary/40 bg-primary-soft" : "border-border bg-card",
      )}
    >
      <div>
        <p className="text-base font-semibold">{on ? "Available for jobs" : "Not accepting requests"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {on
            ? profile.verification_status === "verified"
              ? "Customers in your areas can be matched with you."
              : "You'll start receiving requests once FixRight verifies your account."
            : "You won't receive new requests until you switch this on."}
        </p>
      </div>
      <Switch checked={on} disabled={m.isPending} onCheckedChange={(v) => m.mutate(v)} aria-label="Available for jobs" />
    </div>
  );
}

export function useOfferActions(onDone?: () => void) {
  const qc = useQueryClient();
  const accept = useServerFn(acceptRequest);
  const decline = useServerFn(declineRequest);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: techKeys.offers });
    void qc.invalidateQueries({ queryKey: techKeys.jobs });
    onDone?.();
  };
  const acceptM = useMutation({
    mutationFn: (id: string) => accept({ data: { requestId: id } }),
    onSuccess: () => {
      toast.success("Request accepted. The customer will confirm and pay the service call.");
      refresh();
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Couldn't accept this request.");
      refresh();
    },
  });
  const declineM = useMutation({
    mutationFn: (id: string) => decline({ data: { requestId: id } }),
    onSuccess: () => {
      toast("Request declined.");
      refresh();
    },
    onError: () => toast.error("Couldn't decline this request."),
  });
  return { acceptM, declineM, busy: acceptM.isPending || declineM.isPending };
}

export function OfferCard({ offer }: { offer: TechOffer }) {
  const { acceptM, declineM, busy } = useOfferActions();
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">{offer.service_name} repair</h3>
        <span className="shrink-0 text-xs text-muted-foreground">
          {new Date(offer.offered_at).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">“{offer.problem_description}”</p>
      <div className="mt-4 grid gap-1.5 text-sm">
        <p className="flex items-center gap-2 font-medium"><MapPin className="h-4 w-4 text-primary" />{offer.area_name}</p>
        <p className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          {formatSlot(offer.requested_date)} · {formatTime(offer.availability_start)} – {formatTime(offer.availability_end)}
        </p>
        <p className="text-muted-foreground">Service call · {formatNaira(offer.service_fee)}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => acceptM.mutate(offer.id)}>Accept Request</Button>
        <Button variant="outline" disabled={busy} onClick={() => declineM.mutate(offer.id)}>Decline</Button>
        <Button asChild variant="ghost">
          <Link to="/technician/requests/$requestId" params={{ requestId: offer.id }}>View details</Link>
        </Button>
      </div>
    </div>
  );
}

export function NotVerifiedNotice({ status }: { status: VerificationStatus }) {
  if (status === "verified") return null;
  return (
    <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
      Only verified technicians receive customer requests. Your account is{" "}
      <span className="font-medium text-foreground">{status}</span>. The FixRight team reviews new technicians.
    </div>
  );
}
