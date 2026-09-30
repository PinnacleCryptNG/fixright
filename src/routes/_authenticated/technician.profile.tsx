import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { NotBuiltYet } from "@/components/not-built-yet";

export const Route = createFileRoute("/_authenticated/technician/profile")({
  head: () => ({
    meta: [
      { title: "Technician profile — FixRight" },
      {
        name: "description",
        content: "Your FixRight technician profile: services, service areas and availability.",
      },
    ],
  }),
  component: TechnicianProfile,
});

function TechnicianProfile() {
  return (
    <>
      <PageHeader
        title="Profile"
        description="Your bio, services, service areas and availability. Editing is built in the next iteration."
      />
      <div className="grid gap-5">
        <NotBuiltYet
          title="Services you offer"
          description="Select the repair services you handle from the FixRight service list."
        />
        <NotBuiltYet
          title="Service areas and availability"
          description="Define the areas you cover, your travel radius and whether you are currently available."
        />
        <NotBuiltYet
          title="Verification"
          description="Verification status is managed by the FixRight team and shown here once submitted."
        />
      </div>
    </>
  );
}
