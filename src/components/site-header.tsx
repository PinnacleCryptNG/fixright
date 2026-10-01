import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { homeForRole } from "@/components/role-redirect";
import { clerkAppearance, ThemeToggle, useIsDark } from "@/components/theme";
import { useAppUser } from "@/hooks/use-app-user";
import { Logo } from "@/components/logo";
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
  const isDark = useIsDark();
  const { role } = useAppUser();
  const dashboardHref = homeForRole(role);
  const close = () => setOpen(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-200",
        scrolled || open ? "border-border bg-nav-scrolled shadow-nav" : "border-border/50 bg-nav",
      )}
    >
      <div className="container-page flex h-[70px] items-center justify-between gap-6">
        <Link
          to="/"
          onClick={close}
          className="shrink-0 text-[1.5rem]"
          aria-label="FixRight home"
        >
          <Logo />
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
          <ThemeToggle className="hidden sm:inline-flex" />
          <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
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
            <UserButton key={isDark ? "d" : "l"} appearance={clerkAppearance(isDark)}>
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

      <div id="mobile-nav" className={cn("border-t border-border lg:hidden", open ? "block" : "hidden")}>
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
          <div className="my-3 flex items-center justify-between border-t border-border pt-3 sm:hidden">
            <span className="px-2 text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <div className="my-3 hidden border-t border-border sm:block" />
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
