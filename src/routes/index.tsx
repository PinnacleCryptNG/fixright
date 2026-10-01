import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AirVent,
  Laptop,
  Monitor,
  Refrigerator,
  Smartphone,
  Sparkles,
  WashingMachine,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { homeForRole, RoleRedirect } from "@/components/role-redirect";
import { useAppUser } from "@/hooks/use-app-user";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { TechnicianGrid, TechnicianPortrait } from "@/components/technician/technician-card";
import { listServices, listTechnicians } from "@/lib/fixright.functions";
import type { TechnicianCard } from "@/lib/types";

const TITLE = "FixRight — Something broken? We'll find someone who can fix it.";
const DESC =
  "Tell us what needs fixing, share your location, and we'll connect you with an available technician who covers your area.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  // A dropped network request must never blank the home page: fall back to empty lists.
  loader: async () => ({
    services: await listServices().catch(() => [] as Awaited<ReturnType<typeof listServices>>),
    technicians: await listTechnicians().catch(
      () => [] as Awaited<ReturnType<typeof listTechnicians>>,
    ),
  }),
  component: Landing,
});

const serviceIcons: Record<string, LucideIcon> = {
  "Air Conditioner": AirVent,
  Refrigerator: Refrigerator,
  "Washing Machine": WashingMachine,
  Generator: Zap,
  Television: Monitor,
  Laptop: Laptop,
  Phone: Smartphone,
  Other: Sparkles,
};

const steps = [
  { title: "Tell us what's broken", text: "Describe the problem and what needs attention." },
  { title: "Share your location", text: "We use your location and service area to find eligible technicians." },
  { title: "Choose your time", text: "Tell us when you're available and we'll propose a suitable slot." },
  { title: "Get it fixed", text: "Your technician accepts the request, you confirm, and the repair visit is booked." },
];

const reasons = [
  {
    title: "You describe the problem",
    text: "No need to search through dozens of technicians before knowing who actually covers your area.",
  },
  { title: "You choose when you're available", text: "FixRight works around the time window you provide." },
  {
    title: "You pay the service call after acceptance",
    text: "The ₦1,000 service call is only confirmed after a technician accepts your request.",
  },
];

const journey = ["Problem", "Location", "Technician match", "Time", "Confirmed visit"];

const eyebrow = "text-xs font-semibold uppercase tracking-[0.16em] text-primary";

function HeroMatch({ techs }: { techs: TechnicianCard[] }) {
  const shown = techs.slice(0, 3);
  if (!shown.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Verified on FixRight
        </p>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
          {shown.filter((t) => t.available).length} available
        </span>
      </div>
      <ul className="divide-y divide-border">
        {shown.map((t) => (
          <li key={t.id}>
            <Link
              to="/technicians/$techId"
              params={{ techId: t.id }}
              className="group flex items-center gap-4 px-5 py-4 outline-none transition-colors duration-200 hover:bg-muted/50 focus-visible:bg-muted/50"
            >
              <TechnicianPortrait
                name={t.full_name}
                src={t.avatar_url}
                className="h-14 w-14 shrink-0 rounded-md [&_span]:text-base"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold tracking-tight">{t.full_name}</p>
                <p className="truncate text-sm text-muted-foreground">{t.services.join(" · ")}</p>
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    <span aria-hidden className="text-primary">★</span> {Number(t.rating).toFixed(1)}
                  </span>
                  <span>{t.completed_jobs} jobs</span>
                  {t.areas[0] ? <span className="truncate">{t.areas[0]}</span> : null}
                </p>
              </div>
              <span aria-hidden className="text-muted-foreground transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="border-t border-border px-5 py-3.5 text-xs text-muted-foreground">
        We offer your request to every verified technician who covers your area.
      </p>
    </div>
  );
}

function Landing() {
  const { services, technicians } = Route.useLoaderData();
  const { isLoaded, isSignedIn, role, isPending } = useAppUser();
  // Signed-in users go straight to their own area; wait for Clerk and the role first.
  if (isLoaded && isSignedIn && !isPending) return <RoleRedirect to={homeForRole(role)} />;
  const checking = !isLoaded || (isSignedIn && isPending);

  return (
    <div className="flex min-h-screen flex-col">
      {checking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      ) : null}
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border">
          <div className="container-page grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div className="max-w-2xl">
              <p className={eyebrow}>Repairs, without the runaround</p>
              <h1 className="mt-5 text-4xl leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-[4rem]">
                Something broken?
                <br />
                We'll find someone who can fix it.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{DESC}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                <Button asChild size="lg" className="h-12 px-6 text-base">
                  <Link to="/book">Find a Technician</Link>
                </Button>
                <Link
                  to="/sign-up"
                  search={{ role: "technician" }}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-semibold text-foreground underline-offset-4 hover:underline sm:justify-start"
                >
                  Become a Technician <span aria-hidden>→</span>
                </Link>
              </div>
              <div className="mt-10 max-w-md border-l-2 border-primary/40 pl-4">
                <p className="text-sm font-semibold">₦1,000 service call</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Covers the technician's visit and diagnosis. Labour and replacement parts are separate.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-surface p-4 sm:p-8">
              <HeroMatch techs={technicians} />
            </div>
          </div>
        </section>

        {/* Service discovery */}
        <section id="services" className="border-b border-border py-14 sm:py-16">
          <div className="container-page">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl">What needs fixing?</h2>
                <p className="mt-2 text-sm text-muted-foreground">Start with the thing that's giving you trouble.</p>
              </div>
            </div>
            <ul className="mt-8 grid grid-cols-2 border-l border-t border-border sm:grid-cols-4">
              {services.map((service) => {
                const Icon = serviceIcons[service.name] ?? Sparkles;
                return (
                  <li key={service.id} className="border-b border-r border-border">
                    <Link
                      to="/book"
                      className="group flex h-full items-center justify-between gap-3 px-4 py-5 outline-none transition-colors duration-200 hover:bg-card focus-visible:bg-card sm:px-6"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.6} />
                        <span className="text-sm font-semibold sm:text-base">{service.name}</span>
                      </span>
                      <span aria-hidden className="hidden text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 sm:inline">
                        →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="section-y">
          <div className="container-page">
            <p className={eyebrow}>How it works</p>
            <h2 className="mt-3 max-w-xl text-3xl sm:text-4xl">Four steps from broken to booked.</h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
              {steps.map((step, i) => (
                <li key={step.title} className="border-t border-foreground/80 pt-5 lg:pr-8">
                  <span className="text-5xl font-semibold tracking-[-0.04em] text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-5 text-lg font-semibold tracking-tight">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>

            {/* Customer journey */}
            <div className="mt-16 rounded-xl border border-border bg-surface px-5 py-6 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your request, end to end</p>
              <ol className="mt-4 flex flex-col gap-2 text-sm font-medium sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                {journey.map((j, i) => (
                  <li key={j} className="flex items-center gap-3">
                    <span className={i === journey.length - 1 ? "text-primary" : ""}>{j}</span>
                    {i < journey.length - 1 ? (
                      <span aria-hidden className="text-muted-foreground">
                        <span className="sm:hidden">↓</span>
                        <span className="hidden sm:inline">→</span>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Technician showcase */}
        <section className="border-t border-border section-y">
          <div className="container-page">
            <p className={eyebrow}>Verified professionals</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">People who know how to fix things.</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Verified professionals available across the FixRight network.
            </p>
            {technicians.length ? (
              <div className="mt-10">
                <TechnicianGrid techs={technicians} />
              </div>
            ) : null}
            <Link
              to="/technicians"
              className="group mt-8 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              View all technicians
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </section>

        {/* Trust */}
        <section className="border-t border-border bg-surface section-y">
          <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="text-3xl sm:text-4xl">A simpler way to book a repair.</h2>
            <dl className="divide-y divide-border border-y border-border">
              {reasons.map((r) => (
                <div key={r.title} className="grid gap-2 py-6 sm:grid-cols-[0.9fr_1.1fr] sm:gap-8">
                  <dt className="font-semibold tracking-tight">{r.title}</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground">{r.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border">
          <div className="container-page py-20 text-center sm:py-24">
            <h2 className="text-3xl sm:text-5xl">Ready to get it fixed?</h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Tell us what's wrong and we'll help you find someone who covers your area.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link to="/book">Find a Technician</Link>
              </Button>
              <Link
                to="/sign-up"
                search={{ role: "technician" }}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
              >
                Become a Technician <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
