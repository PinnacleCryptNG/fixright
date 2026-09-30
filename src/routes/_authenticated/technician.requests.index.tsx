import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PageHeader } from "@/components/page-header";
import { AvailabilityToggle, NotVerifiedNotice, OfferCard, techKeys, useTechProfile } from "@/components/technician/tech-ui";
import { listMyOffers } from "@/lib/fixright.functions";

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
  const fetchOffers = useServerFn(listMyOffers);
  const offers = useQuery({ queryKey: techKeys.offers, queryFn: () => fetchOffers(), refetchInterval: 15_000 });
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
            No open requests right now.
          </div>
        )}
      </div>
    </>
  );
}
