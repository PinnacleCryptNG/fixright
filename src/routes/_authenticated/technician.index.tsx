import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { TechProfileForm } from "@/components/technician/profile-form";
import { useTechProfile } from "@/components/technician/tech-ui";

export const Route = createFileRoute("/_authenticated/technician/")({
  head: () => ({
    meta: [
      { title: "Set up your technician profile — FixRight" },
      { name: "description", content: "Tell FixRight what you repair, where you work and when you're available." },
    ],
  }),
  component: TechnicianOnboarding,
});

function TechnicianOnboarding() {
  const { data: profile, isLoading } = useTechProfile();
  const navigate = useNavigate();
  if (isLoading || !profile) return <div className="h-64 animate-pulse rounded-lg border border-border bg-muted" />;
  if (profile.onboarded) return <Navigate to="/technician/dashboard" />;
  return (
    <>
      <PageHeader
        title="Set up your technician profile"
        description="Tell customers what you repair, where you work and when you're free. New profiles are reviewed by FixRight before they receive requests."
      />
      <TechProfileForm profile={profile} submitLabel="Finish setup" onSaved={() => navigate({ to: "/technician/dashboard" })} />
    </>
  );
}
