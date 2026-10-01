import { createFileRoute, Link } from "@tanstack/react-router";
import { SignUp } from "@clerk/clerk-react";
import { z } from "zod";

const searchSchema = z.object({
  role: z.enum(["customer", "technician"]).catch("customer"),
  redirect: z.string().regex(/^\/[a-z0-9/_-]*$/i).optional().catch(undefined),
});

export const Route = createFileRoute("/sign-up")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Create your FixRight account" },
      {
        name: "description",
        content: "Sign up as a FixRight customer or join the platform as a repair technician.",
      },
      { property: "og:title", content: "Create your FixRight account" },
      {
        property: "og:description",
        content: "Sign up as a FixRight customer or join as a repair technician.",
      },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const { role, redirect } = Route.useSearch();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 py-14">
      <Link to="/" className="text-lg font-semibold tracking-tight">
        FixRight
      </Link>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        {role === "technician"
          ? "Create a technician account to offer repair services on FixRight."
          : "Create a customer account to request a repair."}
      </p>
      <SignUp
        routing="hash"
        signInUrl={redirect ? `/sign-in?redirect=${encodeURIComponent(redirect)}` : "/sign-in"}
        forceRedirectUrl={role === "technician" ? "/technician" : (redirect ?? "/dashboard")}
        unsafeMetadata={{ desiredRole: role }}
      />
    </div>
  );
}
