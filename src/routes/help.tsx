import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/info-page";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help — FixRight" },
      { name: "description", content: "Answers to common questions about booking a repair on FixRight." },
      { property: "og:title", content: "Help — FixRight" },
      { property: "og:description", content: "Answers to common questions about booking a repair on FixRight." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <InfoPage title="Help">
      <p>This page is still being written and will be published before FixRight launches publicly.</p>
    </InfoPage>
  ),
});
