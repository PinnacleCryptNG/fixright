import { cn } from "@/lib/utils";

/** The FixRight wordmark: "Fix" in text colour, "Right" in brand green. `onInk` for dark footer surfaces. */
export function Logo({ className, onInk = false }: { className?: string; onInk?: boolean }) {
  return (
    <span className={cn("whitespace-nowrap font-bold tracking-[-0.035em]", className)}>
      <span className={onInk ? "text-ink-foreground" : "text-foreground"}>Fix</span>
      <span className={onInk ? "text-ink-brand" : "text-primary"}>Right</span>
    </span>
  );
}
