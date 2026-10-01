import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";

import { homeForRole } from "@/components/role-redirect";
import { useAppUser } from "@/hooks/use-app-user";
import { cn } from "@/lib/utils";

type NavLink = {
  label: string;
  to: "/" | "/sign-up" | "/about";
  hash?: string;
  search?: { role: "technician" };
};

const publicLinks: NavLink[] = [
  { label: "Find a Technician", to: "/", hash: "services" },
  { label: "How It Works", to: "/", hash: "how-it-works" },
  { label: "For Technicians", to: "/sign-up", search: { role: "technician" } },
  { label: "About", to: "/about" },
];

const linkBase =
  "text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground";
const ctaClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-deep";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { role } = useAppUser();
  const dashboardHref = homeForRole(role);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="container-page flex h-[70px] items-center justify-between gap-6">
        <Link
          to="/"
          onClick={close}
          className="text-xl font-bold tracking-tight text-foreground"
          aria-label="FixRight home"
        >
          Fix<span className="text-primary">Right</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-5 lg:flex lg:gap-8">
          {publicLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              {...(link.hash ? { hash: link.hash } : {})}
              {...(link.search ? { search: link.search } : {})}
              className={linkBase}
              activeOptions={{ exact: true, includeHash: true }}
              activeProps={{ className: link.to === "/about" ? "text-primary" : "" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <SignedOut>
            <Link to="/sign-in" className={cn(linkBase, "hidden px-2 sm:inline-flex")}>
              Sign in
            </Link>
            <Link to="/book" className={cn(ctaClass, "hidden sm:inline-flex")}>
              Book a Repair
            </Link>
          </SignedOut>
          <SignedIn>
            <Link to={dashboardHref} className={cn(linkBase, "hidden px-2 sm:inline-flex")}>
              Dashboard
            </Link>
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Dashboard"
                  labelIcon={<LayoutDashboard className="h-4 w-4" />}
                  href={dashboardHref}
                />
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors duration-200 hover:bg-muted lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            Menu
          </button>
        </div>
      </div>

      <div id="mobile-nav" className={cn("border-t border-border bg-card lg:hidden", open ? "block" : "hidden")}>
        <nav aria-label="Mobile" className="container-page flex flex-col py-4">
          {publicLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              {...(link.hash ? { hash: link.hash } : {})}
              {...(link.search ? { search: link.search } : {})}
              onClick={close}
              className="rounded-md px-2 py-3.5 text-base font-medium text-foreground transition-colors duration-200 hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
          <div className="my-3 border-t border-border" />
          <SignedOut>
            <Link
              to="/sign-in"
              onClick={close}
              className="rounded-md px-2 py-3.5 text-base font-medium text-foreground hover:bg-muted"
            >
              Sign in
            </Link>
            <Link to="/book" onClick={close} className={cn(ctaClass, "mt-2 h-12 text-base")}>
              Book a Repair
            </Link>
          </SignedOut>
          <SignedIn>
            <Link to={dashboardHref} onClick={close} className={cn(ctaClass, "h-12 text-base")}>
              Go to dashboard
            </Link>
          </SignedIn>
        </nav>
      </div>
    </header>
  );
}
