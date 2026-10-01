import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AirVent,
  BadgeCheck,
  CalendarClock,
  Laptop,
  MapPin,
  Monitor,
  Receipt,
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
import { TechnicianGrid } from "@/components/technician/technician-card";
import { listServices, listTechnicians } from "@/lib/fixright.functions";
import { SERVICE_FEE_NOTE } from "@/lib/config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FixRight — Something broken? We'll find someone who can fix it." },
      {
        name: "description",
        content:
          "Tell us what needs fixing, share your location, and we'll connect you with an available technician nearby.",
      },
      {
        property: "og:title",
        content: "FixRight — Something broken? We'll find someone who can fix it.",
      },
      {
        property: "og:description",
        content:
          "Tell us what needs fixing, share your location, and we'll connect you with an available technician nearby.",
      },
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
  { title: "Tell us what's broken", text: "Pick the item and describe the fault in your own words." },
  { title: "Share your location", text: "Your area helps us look for technicians close to you." },
  { title: "We find a nearby technician", text: "We look for an available technician who covers your area." },
  { title: "Get it fixed", text: "Once a technician accepts, your appointment is confirmed." },
];

const trust = [
  { icon: BadgeCheck, title: "Verified technicians", text: "Technicians are reviewed before they appear on FixRight." },
  { icon: MapPin, title: "Nearby matching", text: "We look for technicians who already work in your area." },
  { icon: Receipt, title: "Clear service fees", text: "The ₦1,000 visit and diagnosis fee is stated upfront." },
  { icon: CalendarClock, title: "Easy scheduling", text: "Share the times that work for you and confirm from there." },
];

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
        <section className="border-b border-border bg-surface">
          <div className="container-page grid gap-12 py-16 sm:py-24">
            <div className="rise-in max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Available across Nigeria
              </p>
              <h1 className="mt-6 text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">
                Something broken? We'll find someone who can fix it.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Tell us what needs fixing, share your location, and we'll connect you with an
                available technician nearby.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to="/book">
                    Find a Technician
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/sign-up" search={{ role: "technician" }}>
                    Join as a Technician
                  </Link>
                </Button>
              </div>
              <p className="mt-6 max-w-lg text-xs leading-relaxed text-muted-foreground">
                {SERVICE_FEE_NOTE}
              </p>
            </div>

          </div>
        </section>

        {/* Technician showcase */}
        <section className="section-y">
          <div className="container-page">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Verified professionals</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">People who know how to fix things.</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Verified independent technicians available across Nigeria.
            </p>
            {technicians.length ? (
              <div className="mt-10"><TechnicianGrid techs={technicians} /></div>
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

        {/* How it works */}
        <section id="how-it-works" className="border-t border-border section-y">
          <div className="container-page">
            <h2 className="text-2xl sm:text-3xl">How FixRight works</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <div
                  key={step.title}
                  className="rounded-lg border border-border bg-card p-5 shadow-card"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-xs font-semibold text-accent-foreground">
                    {i + 1}
                  </span>
                  <p className="mt-4 text-sm font-semibold">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="border-y border-border bg-surface section-y">
          <div className="container-page">
            <h2 className="text-2xl sm:text-3xl">What we help you fix</h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Every request starts with a ₦1,000 technician visit and diagnosis fee.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((service) => {
                const Icon = serviceIcons[service.name] ?? Sparkles;
                return (
                  <div
                    key={service.id}
                    className="rounded-lg border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-lift"
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    <p className="mt-4 text-sm font-semibold">{service.name}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="section-y">
          <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <h2 className="text-2xl sm:text-3xl">Built to be worth trusting</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {trust.map((item) => (
                <div key={item.title} className="rounded-lg border border-border bg-card p-5">
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-sm font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="container-page flex flex-col items-start justify-between gap-6 py-14 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl">Ready when something breaks</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Create an account now so your next repair request takes a minute.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/book">
                  Find a Technician
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/sign-up" search={{ role: "technician" }}>
                  Join as a Technician
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
