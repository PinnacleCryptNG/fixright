import { Link, type LinkProps } from "@tanstack/react-router";
import { UserButton } from "@clerk/clerk-react";
import { Wrench } from "lucide-react";
import type { ReactNode } from "react";

export type ShellNavItem = {
  label: string;
  linkProps: LinkProps;
  /** Optional count badge, e.g. new requests. */
  badge?: number;
};

type Props = {
  area: string;
  navItems: ShellNavItem[];
  children: ReactNode;
};

export function DashboardShell({ area, navItems, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Wrench className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight">FixRight</span>
            <span className="ml-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {area}
            </span>
          </Link>
          <UserButton />
        </div>
      </header>

      <div className="container-page flex flex-col gap-8 py-8 lg:flex-row">
        <nav className="flex gap-1 overflow-x-auto lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible">
          {navItems.map((item) => (
            <Link
              key={item.label}
              {...item.linkProps}
              activeOptions={{ exact: true }}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-primary-soft text-accent-foreground font-medium" }}
            >
              <span className="flex items-center justify-between gap-2">
                {item.label}
                {item.badge ? (
                  <span
                    className="min-w-5 rounded-full bg-destructive px-1.5 text-center text-[11px] font-semibold leading-5 text-destructive-foreground"
                    aria-label={`${item.badge} new`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </span>
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
