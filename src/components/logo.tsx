import { useId } from "react";
import { cn } from "@/lib/utils";

/** FixRight mark: green rounded square, deep-green diagonal tool, white wrench. Same art as public/favicon.svg. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("h-[1.25em] w-[1.25em] shrink-0", className)}>
      <defs>
        <mask id={`n${id}`}>
          <rect width="64" height="64" fill="#fff" />
          <rect x="41" y="19.25" width="14" height="7.5" rx="1.5" transform="rotate(-45 41 23)" fill="#000" />
        </mask>
      </defs>
      <rect width="64" height="64" rx="14" fill="#176B52" />
      <path d="M14 20 L44 50 L36 54 L10 28 Z" fill="#0F4D3B" />
      <g fill="#fff" mask={`url(#n${id})`}>
        <circle cx="41" cy="23" r="11.5" />
      </g>
      <path
        d="M15.3 44.8 L33.5 26.6 L37.4 30.5 L19.2 48.7 A2.76 2.76 0 0 1 15.3 44.8 Z"
        fill="#fff"
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The single FixRight logo. `iconOnly` hides the wordmark; `onInk` for the dark footer. Size via font-size. */
export function Logo({
  className,
  onInk = false,
  iconOnly = false,
}: {
  className?: string;
  onInk?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-[0.4em] whitespace-nowrap font-bold tracking-[-0.035em]", className)}>
      <LogoMark />
      {!iconOnly && (
        <span>
          <span className={onInk ? "text-ink-foreground" : "text-foreground"}>Fix</span>
          <span className={onInk ? "text-ink-brand" : "text-primary"}>Right</span>
        </span>
      )}
    </span>
  );
}
