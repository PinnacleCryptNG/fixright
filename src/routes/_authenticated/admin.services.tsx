import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PageHeader } from "@/components/page-header";
import { adminListServices } from "@/lib/fixright.functions";
import { SERVICE_FEE_NOTE } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/admin/services")({
  head: () => ({
    meta: [{ title: "Services — FixRight admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminServices,
});

function AdminServices() {
  const fetchServices = useServerFn(adminListServices);
  const { data, isPending, error } = useQuery({
    queryKey: ["admin-services"],
    queryFn: () => fetchServices(),
    retry: false,
  });

  return (
    <>
      <PageHeader
        title="Services"
        description="The repair categories customers can choose from, with their visit fee."
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Visit fee</th>
              <th className="px-4 py-3 font-medium">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isPending ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                  Loading services…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                  Could not load services.
                </td>
              </tr>
            ) : (
              data?.map((service) => (
                <tr key={service.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{service.description}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{service.category}</td>
                  <td className="px-4 py-3">
                    ₦{Number(service.base_service_fee).toLocaleString("en-NG")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {service.active ? "Yes" : "No"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{SERVICE_FEE_NOTE}</p>
    </>
  );
}
