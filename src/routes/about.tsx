import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/info-page";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About FixRight — FixRight" },
      { name: "description", content: "FixRight helps people in Nigeria book a verified technician to diagnose and fix broken appliances and electronics." },
      { property: "og:title", content: "About FixRight — FixRight" },
      { property: "og:description", content: "FixRight helps people in Nigeria book a verified technician to diagnose and fix broken appliances and electronics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <InfoPage title="About FixRight">
      <p>FixRight is a repair-booking service. You tell us what is broken and where you are, and we look for a verified technician who repairs that item and works in your area.</p>
      <p>Every visit starts with a ₦1,000 fee that covers the technician coming to you and diagnosing the fault. Repair labour and parts are agreed separately with the technician.</p>
      <p>Technicians are reviewed before they can receive requests on FixRight.</p>
    </InfoPage>
  ),
});
