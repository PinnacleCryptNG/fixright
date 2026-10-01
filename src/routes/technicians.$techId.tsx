import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TechnicianPortrait, TechnicianStatus } from "@/components/technician/technician-card";
import { Button } from "@/components/ui/button";
import { getPublicTechnician } from "@/lib/fixright.functions";
import { formatTime } from "@/lib/format";

export const Route = createFileRoute("/technicians/$techId")({
  loader: async ({ params }) => {
    const tech = await getPublicTechnician({ data: { id: params.techId } }).catch(() => null);
    if (!tech) throw notFound();
    return { tech };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.tech.full_name ?? "Technician";
    const desc = `${name} — verified FixRight technician for ${loaderData?.tech.services.join(", ") ?? "repairs"}.`;
    return {
      meta: [
        { title: `${name} — FixRight technician` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} — FixRight technician` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page flex-1 section-y">
        <h1 className="text-2xl">Technician not found</h1>
        <p className="mt-2 text-muted-foreground">This profile isn't available.</p>
        <Link to="/technicians" className="mt-6 inline-block font-semibold text-primary">← Back to technicians</Link>
      </main>
      <SiteFooter />
    </div>
  ),
  component: TechnicianProfilePage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-border py-8 sm:grid-cols-[180px_1fr] sm:gap-8">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function TechnicianProfilePage() {
  const { tech } = Route.useLoaderData();
  const { coverage } = tech;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page flex-1 py-8 sm:py-12">
        <Link
          to="/technicians"
          className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          ← Back to technicians
        </Link>

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
          <TechnicianPortrait
            name={tech.full_name}
            src={tech.avatar_url}
            className="aspect-[4/4.4] rounded-xl border border-border lg:aspect-[4/4.6]"
          />
          <div className="flex flex-col lg:py-4">
            <div className="max-w-xs">
              <TechnicianStatus verification={tech.verification_status} available={tech.available} />
            </div>
            <h1 className="mt-4 text-4xl tracking-tight sm:text-5xl">{tech.full_name}</h1>
            <p className="mt-2 text-muted-foreground">{tech.services.join(" · ")}</p>

            <dl className="mt-8 grid grid-cols-3 border-y border-border">
              {[
                ["Rating", `★ ${Number(tech.rating).toFixed(1)}`],
                ["Jobs completed", String(tech.completed_jobs)],
                ["Experience", `${tech.years_experience} yr${tech.years_experience === 1 ? "" : "s"}`],
              ].map(([k, v]) => (
                <div key={k} className="border-r border-border py-4 pr-3 last:border-r-0 [&:not(:first-child)]:pl-4">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="mt-1 text-lg font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            {tech.areas[0] ? <p className="mt-5 text-sm">{tech.areas[0]}</p> : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="min-h-12">
                <Link to="/book">Book a Repair</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                We'll match you with an available technician who covers your area.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 max-w-4xl">
          <Section title="About">
            <p className="text-foreground/85">{tech.bio || "This technician hasn't added a biography yet."}</p>
          </Section>
          <Section title="Services">
            <ul className="flex flex-wrap gap-2">
              {tech.services.map((s) => (
                <li key={s} className="rounded-md border border-border bg-card px-3 py-1.5">{s}</li>
              ))}
            </ul>
          </Section>
          <Section title="Service area">
            {coverage.state ? (
              <>
                <p className="font-medium">{coverage.state}</p>
                <p className="mt-1 text-muted-foreground">
                  {coverage.entireState ? `All LGAs in ${coverage.state}` : coverage.lgas.join(", ")}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Service area not listed yet.</p>
            )}
          </Section>
          <Section title="Availability">
            <p>
              <span className="font-medium">{tech.available ? "Taking requests" : "Not taking requests right now"}</span>
            </p>
            {tech.work_start && tech.work_end ? (
              <p className="mt-1 text-muted-foreground">
                Working hours {formatTime(tech.work_start)} – {formatTime(tech.work_end)}
              </p>
            ) : null}
          </Section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
