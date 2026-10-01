import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PageHeader } from "@/components/page-header";
import { Link } from "@tanstack/react-router";
import { getAdminOverview } from "@/lib/fixright.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin overview — FixRight" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const fetchOverview = useServerFn(getAdminOverview);
  const { data, isPending, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    retry: false,
  });

  const cards: Array<{ label: string; value: number | undefined }> = [
    { label: "Customers", value: data?.customers },
    { label: "Technicians", value: data?.technicians },
    { label: "Verified technicians", value: data?.verifiedTechnicians },
    { label: "Active services", value: data?.services },
    { label: "Repair requests", value: data?.requests },
    { label: "Appointments", value: data?.appointments },
  ];

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Live counts from the FixRight database."
      />

      {error ? (
        <p className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Could not load platform counts.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-5 shadow-card">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">
              {isPending ? "—" : (card.value ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card p-5 shadow-card">
        <h2 className="text-base font-semibold">What you can do here</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <Link to="/admin/technicians" className="font-medium text-foreground hover:underline">
              Technicians
            </Link>{" "}
            — review applications and approve, reject or suspend technicians. Approved and rejected technicians are emailed the decision.
          </li>
          <li>
            <Link to="/admin/customers" className="font-medium text-foreground hover:underline">
              Customers
            </Link>{" "}
            — see customer accounts with their email, phone and join date.
          </li>
          <li>
            <Link to="/admin/services" className="font-medium text-foreground hover:underline">
              Services
            </Link>{" "}
            — view the repair services and their service-call fees.
          </li>
        </ul>
      </div>
    </>
  );
}
