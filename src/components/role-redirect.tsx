import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import type { AppUser } from "@/lib/types";

type Home = "/dashboard" | "/technician" | "/admin";

/** Where each role lands after signing in. UI routing only — server functions enforce roles. */
export function homeForRole(role: AppUser["role"] | null | undefined): Home {
  if (role === "technician") return "/technician";
  if (role === "admin") return "/admin";
  return "/dashboard";
}

export function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Loading your account…</p>
    </div>
  );
}

/** Replaces the current URL with `to` and shows a minimal loading state meanwhile. */
export function RoleRedirect({ to }: { to: Home }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to, replace: true });
  }, [navigate, to]);
  return <RouteLoading />;
}
