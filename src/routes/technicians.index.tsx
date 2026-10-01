import { createFileRoute } from "@tanstack/react-router";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TechnicianGrid } from "@/components/technician/technician-card";
import { listAllTechnicians } from "@/lib/fixright.functions";

export const Route = createFileRoute("/technicians/")({
  head: () => ({
    meta: [
      { title: "Verified technicians — FixRight" },
      { name: "description", content: "Browse verified independent repair technicians on FixRight across Nigeria." },
      { property: "og:title", content: "Verified technicians — FixRight" },
      { property: "og:description", content: "Browse verified independent repair technicians on FixRight across Nigeria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async () => ({ techs: await listAllTechnicians().catch(() => []) }),
  component: TechniciansPage,
});

function TechniciansPage() {
  const { techs } = Route.useLoaderData();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page flex-1 section-y">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Verified professionals</p>
        <h1 className="mt-3 text-3xl sm:text-4xl">FixRight technicians</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Every technician here has been reviewed by FixRight. When you book, we match you with one who covers your area.
        </p>
        <div className="mt-10">
          {techs.length ? (
            <TechnicianGrid techs={techs} />
          ) : (
            <p className="text-sm text-muted-foreground">No technicians to show right now.</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
