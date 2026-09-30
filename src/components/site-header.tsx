import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Menu, Wrench } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const publicLinks = [
  { label: "Services", to: "/", hash: "services" },
  { label: "How it works", to: "/", hash: "how-it-works" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Wrench className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">FixRight</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {publicLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              hash={link.hash}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/sign-up"
            search={{ role: "technician" }}
            className="transition-colors hover:text-foreground"
          >
            Become a Technician
          </Link>
          <SignedOut>
            <Link to="/sign-in" className="transition-colors hover:text-foreground">
              Sign In
            </Link>
          </SignedOut>
        </nav>

        <div className="flex items-center gap-2">
          <SignedIn>
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/dashboard">My dashboard</Link>
            </Button>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Button asChild size="sm">
              <Link to="/book">
                Find a Technician
              </Link>
            </Button>
          </SignedOut>
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-border bg-card md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="container-page flex flex-col gap-1 py-3 text-sm">
          {publicLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              hash={link.hash}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/sign-up"
            search={{ role: "technician" }}
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Become a Technician
          </Link>
          <SignedOut>
            <Link
              to="/sign-in"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Sign In
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              My dashboard
            </Link>
          </SignedIn>
        </nav>
      </div>
    </header>
  );
}
