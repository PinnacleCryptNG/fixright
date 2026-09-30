import { Construction } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Explicit visual treatment for functionality that is not implemented yet.
 * Never render fake interactive controls in its place.
 */
export function NotBuiltYet({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-dashed border-input bg-card p-6 shadow-card">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Construction className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <p className="mt-3 inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Not built yet
          </p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
