import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/info-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — FixRight" },
      { name: "description", content: "How FixRight handles your personal information." },
      { property: "og:title", content: "Privacy Policy — FixRight" },
      { property: "og:description", content: "How FixRight handles your personal information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <InfoPage title="Privacy Policy">
      <p>This page is still being written and will be published before FixRight launches publicly.</p>
    </InfoPage>
  ),
});
