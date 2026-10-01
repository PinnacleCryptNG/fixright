import { Link } from "@tanstack/react-router";

import type { TechnicianCard as TechnicianCardData, VerificationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function initials(name: string | null) {
  return (name ?? "FixRight")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Portrait with a neutral initials fallback when no photo has been uploaded. */
export function TechnicianPortrait({
  name,
  src,
  className,
  imgClassName,
}: {
  name: string | null;
  src?: string | null | undefined;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src ? (
        <img
          src={src}
          alt={`Portrait of ${name ?? "technician"}`}
          loading="lazy"
          className={cn("h-full w-full object-cover object-top", imgClassName)}
        />
      ) : (
        <div
          role="img"
          aria-label={`${name ?? "Technician"} has no photo yet`}
          className="flex h-full w-full items-center justify-center"
        >
          <span className="text-4xl font-medium tracking-tight text-muted-foreground">{initials(name)}</span>
        </div>
      )}
    </div>
  );
}

const verificationCopy: Record<VerificationStatus, string> = {
  verified: "Verified",
  pending: "Pending review",
  rejected: "Not approved",
  suspended: "Suspended",
};

export function TechnicianStatus({
  verification,
  available,
}: {
  verification?: VerificationStatus;
  available?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs font-medium">
      {verification ? (
        <span
          className={cn(
            "inline-flex items-center gap-1.5",
            verification === "verified" ? "text-primary" : verification === "pending" ? "text-muted-foreground" : "text-warning",
          )}
        >
          {verification === "verified" ? (
            <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
              <path d="M8 0l2 1.6 2.5-.2.8 2.4 2.1 1.4-.8 2.4.8 2.4-2.1 1.4-.8 2.4-2.5-.2L8 16l-2-1.6-2.5.2-.8-2.4L.6 10.8l.8-2.4L.6 6l2.1-1.4.8-2.4 2.5.2zM7 10.6l4.3-4.3-1-1L7 8.6 5.7 7.3l-1 1z" />
            </svg>
          ) : null}
          {verificationCopy[verification]}
        </span>
      ) : <span />}
      {available !== undefined ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", available ? "bg-primary" : "bg-muted-foreground/50")} />
          {available ? "Available" : "Not available now"}
        </span>
      ) : null}
    </div>
  );
}

export function TechnicianCard({ tech }: { tech: TechnicianCardData }) {
  return (
    <Link
      to="/technicians/$techId"
      params={{ techId: tech.id }}
      aria-label={`View profile of ${tech.full_name ?? "technician"}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card outline-none transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[3px] hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <TechnicianPortrait
        name={tech.full_name}
        src={tech.avatar_url}
        className="aspect-[4/3.4] border-b border-border"
        imgClassName="transition-transform duration-200 ease-out group-hover:scale-[1.02]"
      />
      <div className="flex flex-1 flex-col p-5">
        <TechnicianStatus verification={tech.verification_status} available={tech.available} />
        <h3 className="mt-4 text-xl font-semibold tracking-tight">{tech.full_name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{tech.services.join(" · ")}</p>
        <p className="mt-4 flex items-center gap-4 text-sm">
          <span className="font-semibold">
            <span aria-hidden className="text-primary">★</span> {Number(tech.rating).toFixed(1)}
            <span className="sr-only"> out of 5 rating</span>
          </span>
          <span className="text-muted-foreground">{tech.completed_jobs} jobs completed</span>
        </p>
        {tech.areas[0] ? <p className="mt-1 text-sm text-muted-foreground">{tech.areas[0]}</p> : null}
        {tech.bio ? <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-foreground/80">{tech.bio}</p> : null}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-primary">
          View profile
          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}

export function TechnicianGrid({ techs }: { techs: TechnicianCardData[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {techs.map((t) => (
        <TechnicianCard key={t.id} tech={t} />
      ))}
    </div>
  );
}
