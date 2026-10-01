import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type Theme = "light" | "dark";
const KEY = "fixright:theme";

/** Runs in <head> before paint: stored choice, else the OS preference. Prevents a flash. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`;

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);
  const setTheme = (t: Theme) => {
    const root = document.documentElement;
    root.classList.add("theme-anim");
    root.classList.toggle("dark", t === "dark");
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* storage unavailable */
    }
    setThemeState(t);
    window.setTimeout(() => root.classList.remove("theme-anim"), 220);
  };
  return { theme, setTheme };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Colour theme" className={cn("inline-flex h-9 items-center rounded-md border border-border bg-card/60 p-0.5", className)}>
      {(["light", "dark"] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          aria-label={t === "light" ? "Light theme" : "Dark theme"}
          onClick={() => setTheme(t)}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-muted-foreground transition-colors duration-150 hover:text-foreground",
            theme === t && "bg-foreground text-background hover:text-background",
          )}
        >
          {t === "light" ? (
            <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="8" cy="8" r="3" />
              <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" />
            </svg>
          ) : (
            <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

/** Soft ambient layers that drift a few pixels toward the pointer (fine pointers only). */
export function AmbientBackground() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;
    let tx = 0, ty = 0, x = 0, y = 0, lx = 50, ly = 30, tlx = 50, tly = 30, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      lx += (tlx - lx) * 0.04;
      ly += (tly - ly) * 0.04;
      el.style.setProperty("--px", x.toFixed(3));
      el.style.setProperty("--py", y.toFixed(3));
      el.style.setProperty("--lx", lx.toFixed(2));
      el.style.setProperty("--ly", ly.toFixed(2));
      raf = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(tlx - lx) + Math.abs(tly - ly) > 0.01 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
      tlx = (e.clientX / innerWidth) * 100;
      tly = (e.clientY / innerHeight) * 100;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    addEventListener("pointermove", onMove, { passive: true });
    return () => {
      removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={ref} className="ambient" aria-hidden>
      <span className="a1" />
      <span className="a2" />
      <span className="a3" />
      <span className="a4" />
    </div>
  );
}

/** Tracks the live `.dark` class on <html>, so any component re-renders when the theme changes. */
export function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}
