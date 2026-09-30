import { createFileRoute, Link } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";

export const Route = createFileRoute("/sign-in")({
  ssr: false,
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
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface px-5 py-14">
      <Link to="/" className="text-lg font-semibold tracking-tight">
        FixRight
      </Link>
      <SignIn routing="hash" signUpUrl="/sign-up" forceRedirectUrl="/dashboard" />
    </div>
  );
}
