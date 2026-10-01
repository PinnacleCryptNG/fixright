import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/info-page";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — FixRight" },
      { name: "description", content: "How to get in touch with the FixRight team." },
      { property: "og:title", content: "Contact — FixRight" },
      { property: "og:description", content: "How to get in touch with the FixRight team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <InfoPage title="Contact">
      <p>This page is still being written and will be published before FixRight launches publicly.</p>
    </InfoPage>
  ),
});
