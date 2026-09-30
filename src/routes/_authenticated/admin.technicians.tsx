import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PageHeader } from "@/components/page-header";
import { adminListTechnicians } from "@/lib/fixright.functions";

export const Route = createFileRoute("/_authenticated/admin/technicians")({
  head: () => ({
    meta: [{ title: "Technicians — FixRight admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminTechnicians,
});

function AdminTechnicians() {
  const fetchTechnicians = useServerFn(adminListTechnicians);
  const { data, isPending, error } = useQuery({
    queryKey: ["admin-technicians"],
    queryFn: () => fetchTechnicians(),
    retry: false,
  });

  return (
    <>
      <PageHeader
        title="Technicians"
        description="Every technician account with its verification status and coverage."
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Services</th>
              <th className="px-4 py-3 font-medium">Areas</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Jobs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isPending ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                  Loading technicians…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                  Could not load technicians.
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((tech) => (
                <tr key={tech.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{tech.full_name}</p>
                    <p className="text-xs text-muted-foreground">{tech.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tech.services.join(", ")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tech.areas.join(", ")}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs capitalize">
                      {tech.verification_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{Number(tech.rating).toFixed(1)}</td>
                  <td className="px-4 py-3">{tech.completed_jobs}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                  No technicians yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
