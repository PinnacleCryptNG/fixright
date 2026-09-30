import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { useAppUser } from "@/hooks/use-app-user";

/**
 * Admin area. Two conditions are required: an authenticated Clerk user (the
 * parent _authenticated gate) AND an application role of `admin`, read from
 * the database. Every admin server function re-checks the role server-side, so
 * hiding this route is never the security boundary.
 */
export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { role, isPending } = useAppUser();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your access…</p>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="max-w-md rounded-lg border border-border bg-card p-7 text-center shadow-card">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <h1 className="mt-5 text-xl">Admin access only</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your account does not have the FixRight administrator role.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to your dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      area="Admin"
      navItems={[
        { label: "Overview", linkProps: { to: "/admin" } },
        { label: "Technicians", linkProps: { to: "/admin/technicians" } },
        { label: "Customers", linkProps: { to: "/admin/customers" } },
        { label: "Requests", linkProps: { to: "/admin/requests" } },
        { label: "Appointments", linkProps: { to: "/admin/appointments" } },
        { label: "Services", linkProps: { to: "/admin/services" } },
      ]}
    >
      <Outlet />
    </DashboardShell>
  );
}
