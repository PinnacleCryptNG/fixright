import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { NotBuiltYet } from "@/components/not-built-yet";

export const Route = createFileRoute("/_authenticated/technician/dashboard")({
  head: () => ({
    meta: [
      { title: "Technician jobs — FixRight" },
      { name: "description", content: "Your FixRight jobs, appointments and completed work." },
    ],
  }),
  component: TechnicianJobs,
});

function TechnicianJobs() {
  return (
    <>
      <PageHeader
        title="Jobs"
        description="Accepted requests, upcoming appointments and completed jobs will be listed here."
      />
      <div className="grid gap-5">
        <NotBuiltYet
          title="Upcoming appointments"
          description="Appointments appear once request matching and confirmation are implemented."
        />
        <NotBuiltYet
          title="Job history"
          description="Completed jobs and ratings will be summarised here."
        />
      </div>
    </>
  );
}
