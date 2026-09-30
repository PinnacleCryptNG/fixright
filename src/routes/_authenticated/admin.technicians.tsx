import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminGetTechnician, adminListTechnicians, adminSetVerification } from "@/lib/fixright.functions";
import { formatTime } from "@/lib/format";
import type { VerificationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/technicians")({
  head: () => ({
    meta: [{ title: "Technicians — FixRight admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminTechnicians,
});

const FILTERS = ["all", "pending", "verified", "rejected", "suspended"] as const;
type Filter = (typeof FILTERS)[number];

function StatusPill({ status }: { status: VerificationStatus }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs capitalize",
        status === "verified" ? "border-primary/40 bg-primary-soft text-accent-foreground" : "border-border bg-surface",
      )}
    >
      {status}
    </span>
  );
}

function AdminTechnicians() {
  const fetchTechnicians = useServerFn(adminListTechnicians);
  const [filter, setFilter] = useState<Filter>("all");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const { data, isPending, error } = useQuery({
    queryKey: ["admin-technicians"],
    queryFn: () => fetchTechnicians(),
    retry: false,
  });

  const pending = (data ?? []).filter((t) => t.verification_status === "pending");
  const rows = (data ?? []).filter((t) => filter === "all" || t.verification_status === filter);
  const count = (f: Filter) => (data ?? []).filter((t) => f === "all" || t.verification_status === f).length;

  return (
    <>
      <PageHeader title="Technicians" description="Review new technicians and manage verification status." />

      {pending.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Pending verification</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((t) => (
              <div key={t.id} className="rounded-lg border border-primary/30 bg-card p-5 shadow-card">
                <p className="text-base font-semibold">{t.full_name ?? "Unnamed technician"}</p>
                <p className="text-sm text-muted-foreground">{t.years_experience} years experience</p>
                <p className="mt-2 flex items-center gap-1.5 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  {t.areas.length ? `${t.areas.join(", ")}, Kaduna` : "No areas yet"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Services: {t.services.join(", ") || "None yet"}</p>
                <Button className="mt-4" onClick={() => setReviewId(t.id)}>Review</Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
            {f} {data ? <span className="ml-1 opacity-70">{count(f)}</span> : null}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Services</th>
              <th className="px-4 py-3 font-medium">Areas</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Jobs</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isPending ? (
              <tr><td colSpan={7} className="px-4 py-6 text-muted-foreground">Loading technicians…</td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="px-4 py-6 text-muted-foreground">Could not load technicians.</td></tr>
            ) : rows.length > 0 ? (
              rows.map((tech) => (
                <tr key={tech.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{tech.full_name}</p>
                    <p className="text-xs text-muted-foreground">{tech.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tech.services.join(", ")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tech.areas.join(", ")}</td>
                  <td className="px-4 py-3"><StatusPill status={tech.verification_status} /></td>
                  <td className="px-4 py-3">{Number(tech.rating).toFixed(1)}</td>
                  <td className="px-4 py-3">{tech.completed_jobs}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setReviewId(tech.id)}>Review</Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={7} className="px-4 py-6 text-muted-foreground">No technicians in this list.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ReviewDialog id={reviewId} onClose={() => setReviewId(null)} />
    </>
  );
}

function ReviewDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const fetchOne = useServerFn(adminGetTechnician);
  const setStatus = useServerFn(adminSetVerification);
  const { data: t, isPending } = useQuery({
    queryKey: ["admin-technician", id],
    enabled: Boolean(id),
    queryFn: () => fetchOne({ data: { id: id! } }),
  });
  const m = useMutation({
    mutationFn: (status: VerificationStatus) => setStatus({ data: { id: id!, status } }),
    onSuccess: (r) => {
      toast.success(`Technician marked ${r.status}.`);
      void qc.invalidateQueries({ queryKey: ["admin-technicians"] });
      void qc.invalidateQueries({ queryKey: ["admin-technician", id] });
    },
    onError: () => toast.error("Couldn't update this technician."),
  });

  const rows: Array<[string, React.ReactNode]> = t
    ? [
        ["Phone", t.phone ?? "—"],
        ["Email", t.email ?? "—"],
        ["Experience", `${t.years_experience} years`],
        ["Services", t.services.join(", ") || "—"],
        ["Coverage areas", t.areas.join(", ") || "—"],
        ["Travel distance", `${t.service_radius_km} km`],
        ["Working hours", `${formatTime(t.work_start)} – ${formatTime(t.work_end)}`],
        ["Availability", t.available ? "Available" : "Not available"],
        ["Joined", new Date(t.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })],
        ["Status", <StatusPill key="s" status={t.verification_status} />],
      ]
    : [];

  return (
    <Dialog open={Boolean(id)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Technician profile</DialogTitle></DialogHeader>
        {isPending || !t ? (
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        ) : (
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              {t.avatar_url ? (
                <img src={t.avatar_url} alt="" className="h-14 w-14 rounded-full border border-border object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold">
                  {(t.full_name ?? "?").charAt(0)}
                </div>
              )}
              <p className="text-lg font-semibold">{t.full_name ?? "Unnamed technician"}</p>
            </div>
            {t.bio ? <p className="text-sm leading-relaxed text-muted-foreground">{t.bio}</p> : null}
            <dl className="grid gap-2 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[9rem_1fr] gap-2 border-b border-border pb-2 last:border-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2">
              {t.verification_status !== "verified" ? (
                <Button disabled={m.isPending} onClick={() => m.mutate("verified")}>Approve technician</Button>
              ) : null}
              {t.verification_status === "pending" || t.verification_status === "verified" ? (
                <Button variant="outline" disabled={m.isPending} onClick={() => m.mutate("rejected")}>Reject technician</Button>
              ) : null}
              {t.verification_status === "verified" ? (
                <Button variant="ghost" disabled={m.isPending} onClick={() => m.mutate("suspended")}>Suspend</Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
