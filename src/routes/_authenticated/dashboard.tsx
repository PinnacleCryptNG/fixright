import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, MapPin } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { ServiceIcon } from "@/components/service-icon";
import { Button } from "@/components/ui/button";
import { RoleRedirect, RouteLoading } from "@/components/role-redirect";
import { useAppUser } from "@/hooks/use-app-user";
import { SERVICE_FEE_NOTE } from "@/lib/config";
import { formatNaira, formatSlot } from "@/lib/format";
import { getMyBookings } from "@/lib/fixright.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — FixRight" },
      { name: "description", content: "Track your FixRight repair requests and appointments." },
    ],
  }),
  component: CustomerDashboard,
});

const statusLabel: Record<string, string> = {
  submitted: "Submitted",
  matching: "Finding technician",
  technician_pending: "Technician accepted — payment required",
  on_the_way: "Technician on the way",
  arrived: "Technician arrived",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  scheduled: "Scheduled",
};

function CustomerDashboard() {
  const { appUser, role, isPending } = useAppUser();
  const fetchBookings = useServerFn(getMyBookings);
  const { data, isLoading } = useQuery({
    queryKey: ["my-bookings", appUser?.id],
    enabled: role === "customer",
    queryFn: () => fetchBookings(),
  });

  if (isPending) return <RouteLoading />;
  if (role === "technician") return <RoleRedirect to="/technician" />;

  return (
    <DashboardShell area="Customer" navItems={[{ label: "Overview", linkProps: { to: "/dashboard" } }]}>
      <PageHeader
        title={
          isPending
            ? "Your dashboard"
            : `Welcome${appUser?.full_name ? `, ${appUser.full_name.split(" ")[0]}` : ""}`
        }
        description="Your repair requests and appointments."
      />


      <div className="grid gap-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming appointment</h2>
            <Button asChild size="sm"><Link to="/book">Request a repair</Link></Button>
          </div>
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-lg border border-border bg-muted" />
          ) : data?.upcoming.length ? (
            <div className="grid gap-3">
              {data.upcoming.map((a) => (
                <div key={a.id} className="rounded-lg border border-border bg-card p-5 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ServiceIcon name={a.service_name ?? ""} className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-semibold">{a.service_name} repair</p>
                        <p className="text-sm text-muted-foreground">with {a.technician_name}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                      {statusLabel[a.status] ?? a.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-1.5 text-sm">
                    <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" />{formatSlot(a.appointment_date, a.start_time, a.end_time)}</p>
                    <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{a.address}, {a.area_name}</p>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Service call {formatNaira(a.service_fee)} ·{" "}
                    {a.payment_status === "paid" ? "Paid" : "Not paid"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              No confirmed visits yet. Once you pay the service call for an accepted request, it shows here.
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Recent repair requests</h2>
          {data?.requests.length ? (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {data.requests.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.service_name}</p>
                    <p className="truncate text-sm text-muted-foreground">{r.problem_description}</p>
                  </div>
                  {r.status === "matching" && r.waiting ? (
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs">Waiting for a technician</span>
                    </div>
                  ) : r.status === "technician_pending" ? (
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-accent-foreground">Technician accepted — payment required</span>
                      <Link to="/book" search={{ request: r.id }} className="text-xs font-medium text-primary hover:underline">Pay ₦1,000</Link>
                    </div>
                  ) : r.status === "matching" && !r.has_technician ? (
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs">No technician found</span>
                      <Link to="/book" className="text-xs font-medium text-primary hover:underline">Try again</Link>
                    </div>
                  ) : (
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs">
                      {statusLabel[r.status] ?? r.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            isLoading ? (
            <p className="text-sm text-muted-foreground" role="status">Loading your repairs…</p>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card p-6">
              <p className="font-semibold">Nothing needs fixing yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Tell us what's broken and we'll find someone who can help.</p>
              <Button asChild size="sm" className="mt-4"><Link to="/book">Book a Repair</Link></Button>
            </div>
          )}
        </section>

        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <p className="text-sm font-semibold">What a visit costs</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{SERVICE_FEE_NOTE}</p>
        </div>
      </div>
    </DashboardShell>
  );
}
