import { Link } from "@tanstack/react-router";

import { SERVICE_FEE_NOTE } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <p className="text-lg font-semibold tracking-tight">FixRight</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A repair-booking service connecting customers with nearby available technicians.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{SERVICE_FEE_NOTE}</p>
        </div>

        <div>
          <p className="text-sm font-medium">Customers</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" hash="how-it-works" className="hover:text-foreground">
                How it works
              </Link>
            </li>
            <li>
              <Link to="/" hash="services" className="hover:text-foreground">
                Services
              </Link>
            </li>
            <li>
              <Link to="/sign-up" search={{ role: "customer" }} className="hover:text-foreground">
                Find a technician
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium">Technicians</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/sign-up" search={{ role: "technician" }} className="hover:text-foreground">
                Join as a technician
              </Link>
            </li>
            <li>
              <Link to="/sign-in" className="hover:text-foreground">
                Technician sign in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page py-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} FixRight. Demo environment with fictional technician data.
        </div>
      </div>
    </footer>
  );
}
