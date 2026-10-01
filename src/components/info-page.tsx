import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** Simple public text page sharing the site header and footer. */
export function InfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container-page max-w-3xl py-16 sm:py-24">
          <h1 className="text-[34px] sm:text-[42px]">{title}</h1>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
