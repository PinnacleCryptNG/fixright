import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AvailabilityToggle, NotVerifiedNotice, OfferCard, techKeys, useTechProfile, VerificationBadge } from "@/components/technician/tech-ui";
import { Button } from "@/components/ui/button";
import { listMyJobs } from "@/lib/fixright.functions";
import { NotificationPermissionControl, useOpenOffers } from "@/components/technician/request-notifications";
import { formatSlot } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/technician/dashboard")({
  head: () => ({
    meta: [
      { title: "Technician dashboard — FixRight" },
      { name: "description", content: "Your availability, new repair requests and upcoming FixRight jobs." },
    ],
  }),
  component: TechnicianDashboard,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function TechnicianDashboard() {
  const { data: profile } = useTechProfile();
  const fetchJobs = useServerFn(listMyJobs);
  const offers = useOpenOffers();
  const jobs = useQuery({ queryKey: techKeys.jobs, queryFn: () => fetchJobs() });
  const next = (jobs.data ?? []).filter((j) => j.status !== "completed").slice(0, 3);

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting()}{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          {profile ? <div className="mt-2"><VerificationBadge status={profile.verification_status} /></div> : null}
        </div>
      </div>

      {profile && !profile.onboarded ? (
        <div className="rounded-lg border border-primary/40 bg-primary-soft p-4 text-sm text-accent-foreground">
          Finish your profile so customers can be matched with you.{" "}
          <Link to="/technician" className="font-medium underline">Complete setup</Link>
        </div>
      ) : null}

      <AvailabilityToggle />
      <NotificationPermissionControl />
      {profile ? <NotVerifiedNotice status={profile.verification_status} /> : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">New requests</h2>
            {offers.data?.length ? (
              <p className="text-sm font-medium text-primary">
                {offers.data.length} new request{offers.data.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
          <Link to="/technician/requests" className="text-sm font-medium text-primary hover:underline">See all</Link>
        </div>
        {offers.isLoading ? (
          <div className="h-40 animate-pulse rounded-lg border border-border bg-muted" />
        ) : offers.data?.length ? (
          <div className="grid gap-4">{offers.data.slice(0, 3).map((o) => <OfferCard key={o.id} offer={o} />)}</div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            No new requests right now. New requests in your areas appear here automatically.
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Coming up</h2>
          <Button asChild size="sm" variant="outline"><Link to="/technician/jobs">My Jobs</Link></Button>
        </div>
        {next.length ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {next.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium">{j.service_name} · {j.area_name}</p>
                  <p className="text-muted-foreground">{formatSlot(j.date, j.start_time, j.end_time)}</p>
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                  {j.status === "awaiting_payment" ? "Awaiting customer payment" : j.status.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming jobs yet.</p>
        )}
      </section>
    </div>
  );
}
