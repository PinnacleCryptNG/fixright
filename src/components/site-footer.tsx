import { Link } from "@tanstack/react-router";

type FooterLink = {
  label: string;
  to: "/" | "/book" | "/sign-up" | "/sign-in" | "/about" | "/contact" | "/help" | "/privacy" | "/terms";
  hash?: string;
  search?: { role: "technician" };
};

const groups: { title: string; links: FooterLink[] }[] = [
  {
    title: "For customers",
    links: [
      { label: "Find a Technician", to: "/", hash: "services" },
      { label: "How It Works", to: "/", hash: "how-it-works" },
      { label: "Book a Repair", to: "/book" },
    ],
  },
  {
    title: "For technicians",
    links: [
      { label: "Become a Technician", to: "/sign-up", search: { role: "technician" } },
      { label: "How FixRight Works", to: "/", hash: "how-it-works" },
      { label: "Technician Sign In", to: "/sign-in" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About FixRight", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Help", to: "/help" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="container-page py-16 sm:py-20">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xl font-bold tracking-tight">FixRight</p>
            <p className="mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Something broken?
              <br />
              We'll find someone who can fix it.
            </p>
          </div>
          <Link
            to="/book"
            className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-deep sm:w-auto"
          >
            Find a Technician
          </Link>
        </div>

        <div className="mt-14 border-t border-ink-foreground/15" />

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="text-[13px] font-medium uppercase tracking-wider text-ink-muted">
                {group.title}
              </p>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      hash={link.hash}
                      search={link.search}
                      className="text-[15px] text-ink-foreground/85 transition-colors duration-200 hover:text-ink-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-ink-foreground/15 pt-6 text-[13px] text-ink-muted sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} FixRight</p>
          <p>Available across Nigeria</p>
        </div>
      </div>
    </footer>
  );
}
