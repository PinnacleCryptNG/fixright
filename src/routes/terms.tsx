import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/info-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — FixRight" },
      { name: "description", content: "The terms that apply when you use FixRight." },
      { property: "og:title", content: "Terms of Service — FixRight" },
      { property: "og:description", content: "The terms that apply when you use FixRight." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <InfoPage title="Terms of Service">
      <p>This page is still being written and will be published before FixRight launches publicly.</p>
    </InfoPage>
  ),
});
