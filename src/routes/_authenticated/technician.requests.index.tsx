import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { AvailabilityToggle, NotVerifiedNotice, OfferCard, useTechProfile } from "@/components/technician/tech-ui";
import { useOpenOffers } from "@/components/technician/request-notifications";

export const Route = createFileRoute("/_authenticated/technician/requests/")({
  head: () => ({
    meta: [
      { title: "Repair requests — FixRight technician" },
      { name: "description", content: "Repair requests in your areas that you can accept or decline." },
    ],
  }),
  component: TechnicianRequests,
});

function TechnicianRequests() {
  const { data: profile } = useTechProfile();
  const offers = useOpenOffers();
  return (
    <>
      <PageHeader title="New requests" description="Requests from customers in your areas, for services you repair. The first technician to accept gets the job." />
      <div className="grid gap-5">
        <AvailabilityToggle />
        {profile ? <NotVerifiedNotice status={profile.verification_status} /> : null}
        {offers.isLoading ? (
          <div className="h-40 animate-pulse rounded-lg border border-border bg-muted" />
        ) : offers.data?.length ? (
          offers.data.map((o) => <OfferCard key={o.id} offer={o} />)
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            No new repair requests. Requests that match your services, areas and hours will appear here as they come in.
          </div>
        )}
      </div>
    </>
  );
}
