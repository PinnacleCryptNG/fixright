import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { TechProfileForm } from "@/components/technician/profile-form";
import { NotVerifiedNotice, useTechProfile, VerificationBadge } from "@/components/technician/tech-ui";

export const Route = createFileRoute("/_authenticated/technician/profile")({
  head: () => ({
    meta: [
      { title: "Technician profile — FixRight" },
      { name: "description", content: "Your FixRight technician profile: services, service areas and availability." },
    ],
  }),
  component: TechnicianProfile,
});

function TechnicianProfile() {
  const { data: profile, isLoading } = useTechProfile();
  if (isLoading || !profile) return <div className="h-64 animate-pulse rounded-lg border border-border bg-muted" />;
  return (
    <>
      <PageHeader title="Profile" description="What customers see about you, and where and when you work." />
      <div className="mb-6 grid gap-3">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <VerificationBadge status={profile.verification_status} />
          <span className="text-sm text-muted-foreground">
            ★ {Number(profile.rating).toFixed(1)} · {profile.completed_jobs} jobs completed
          </span>
        </div>
        <NotVerifiedNotice status={profile.verification_status} />
      </div>
      <TechProfileForm profile={profile} submitLabel="Save profile" />
    </>
  );
}
