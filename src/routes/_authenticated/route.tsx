import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";

/**
 * Gate for every authenticated route. Clerk stores its session in the browser,
 * so this subtree is client-rendered. Server functions re-verify the session
 * token independently — this gate is UI only.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip once navigation to sign-in has started, so the return address stays the original page.
    if (isLoaded && !isSignedIn && !location.pathname.startsWith("/sign-")) {
      navigate({ to: "/sign-in", search: { redirect: location.pathname }, replace: true });
    }
  }, [isLoaded, isSignedIn, navigate, location.pathname]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </div>
    );
  }

  return <Outlet />;
}
