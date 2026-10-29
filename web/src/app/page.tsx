import type { Metadata } from "next";
import { BentoSection } from "@/components/marketing/bento-section";
import {
  EngineeringBand,
  HowItWorks,
} from "@/components/marketing/how-it-works";
import {
  Faq,
  FinalCta,
  SelfHost,
  SiteFooter,
  StatusShowcase,
} from "@/components/marketing/landing-closing";
import { Hero, ProtocolStrip } from "@/components/marketing/landing-hero";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Vigil — Know before they notice.",
  description:
    "Self-hosted API performance and uptime monitoring. Probe every endpoint, store every millisecond in PostgreSQL, and publish a status page that tells the truth.",
};

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader />
      <main>
        <Hero />
        <ProtocolStrip />
        <BentoSection />
        <HowItWorks />
        <EngineeringBand />
        <StatusShowcase />
        <SelfHost />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
