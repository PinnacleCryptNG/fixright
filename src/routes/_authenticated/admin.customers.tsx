import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PageHeader } from "@/components/page-header";
import { adminListCustomers } from "@/lib/fixright.functions";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => ({
    meta: [{ title: "Customers — FixRight admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminCustomers,
});

function AdminCustomers() {
  const fetchCustomers = useServerFn(adminListCustomers);
  const { data, isPending, error } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fetchCustomers(),
    retry: false,
  });

  return (
    <>
      <PageHeader title="Customers" description="Accounts registered as customers on FixRight." />

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
        <table className="w-full min-w-[32rem] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isPending ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                  Loading customers…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                  Could not load customers.
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3 font-medium">{customer.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{customer.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{customer.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(customer.created_at).toLocaleDateString("en-NG")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                  No customer accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
