import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { NotBuiltYet } from "@/components/not-built-yet";

export const Route = createFileRoute("/_authenticated/admin/appointments")({
  head: () => ({
    meta: [{ title: "Appointments — FixRight admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminAppointments,
});

function AdminAppointments() {
  return (
    <>
      <PageHeader
        title="Appointments"
        description="Confirmed visits between customers and technicians, with their payment status."
      />
      <NotBuiltYet
        title="Appointment list"
        description="Appointments are created once a technician accepts a matched request — that flow is next."
      />
    </>
  );
}
