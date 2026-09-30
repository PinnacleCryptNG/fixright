import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff, Check } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { listMyOffers } from "@/lib/fixright.functions";
import { formatDay, formatTime } from "@/lib/format";
import { getPermission, takeNewRequestIds, type NotifyPermission } from "@/lib/request-notify";
import { techKeys, useTechProfile } from "./tech-ui";

const POLL_MS = 12_000;

/** Shared, polled list of open requests. React Query dedupes this across components. */
export function useOpenOffers() {
  const fetchOffers = useServerFn(listMyOffers);
  return useQuery({
    queryKey: techKeys.offers,
    queryFn: () => fetchOffers(),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
  });
}

/** Mounted once in the technician layout: fires one browser notification per new request. */
export function RequestNotifier() {
  const { data: profile } = useTechProfile();
  const { data: offers } = useOpenOffers();
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile || !offers) return;
    const fresh = takeNewRequestIds(localStorage, profile.id, offers.map((o) => o.id));
    if (!fresh.length || getPermission() !== "granted") return;
    for (const o of offers.filter((x) => fresh.includes(x.id))) {
      try {
        const n = new Notification("New FixRight repair request", {
          body: `${o.service_name ?? "Repair"} repair · ${o.area_name ?? ""} · ${formatDay(o.requested_date)}, ${formatTime(o.availability_start)}–${formatTime(o.availability_end)}`,
          icon: "/favicon.ico",
          tag: `fixright-request-${o.id}`,
        });
        n.onclick = () => {
          window.focus();
          void navigate({ to: "/technician/requests/$requestId", params: { requestId: o.id } });
          n.close();
        };
      } catch {
        /* notifications unavailable in this context: the dashboard still shows the request */
      }
    }
  }, [profile, offers, navigate]);

  return null;
}

export function NotificationPermissionControl() {
  const [perm, setPerm] = useState<NotifyPermission>("default");
  useEffect(() => setPerm(getPermission()), []);

  if (perm === "unsupported") return null;
  if (perm === "granted") {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm text-primary">
        <Check className="h-4 w-4" /> Notifications enabled
      </p>
    );
  }
  if (perm === "denied") {
    return (
      <p className="inline-flex items-start gap-1.5 text-sm text-muted-foreground">
        <BellOff className="mt-0.5 h-4 w-4 shrink-0" />
        Browser notifications are blocked. You can still see new requests in your dashboard.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <p className="inline-flex items-center gap-2 text-sm font-medium">
        <Bell className="h-4 w-4 text-primary" /> Get notified about new requests
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          try {
            setPerm((await Notification.requestPermission()) as NotifyPermission);
          } catch {
            setPerm(getPermission());
          }
        }}
      >
        Enable notifications
      </Button>
    </div>
  );
}
