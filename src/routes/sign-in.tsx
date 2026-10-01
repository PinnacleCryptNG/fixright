import { createFileRoute, Link } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";
import { z } from "zod";

import { clerkAppearance, useIsDark } from "@/components/theme";

const searchSchema = z.object({
  redirect: z.string().regex(/^\/[a-z0-9/_-]*$/i).optional().catch(undefined),
});

export const Route = createFileRoute("/sign-in")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — FixRight" },
      { name: "description", content: "Sign in to your FixRight customer or technician account." },
      { property: "og:title", content: "Sign in — FixRight" },
      { property: "og:description", content: "Sign in to your FixRight account." },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const isDark = useIsDark();
  const { redirect } = Route.useSearch();
  const target = redirect ?? "/dashboard";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 py-14">
      <Link to="/" className="text-lg font-semibold tracking-tight">
        FixRight
      </Link>
      <SignIn
        key={isDark ? "dark" : "light"}
        appearance={clerkAppearance(isDark)}
        routing="hash"
        signUpUrl={redirect ? `/sign-up?role=customer&redirect=${encodeURIComponent(redirect)}` : "/sign-up"}
        forceRedirectUrl={target}
      />
    </div>
  );
}
