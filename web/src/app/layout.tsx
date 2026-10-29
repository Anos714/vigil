import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Vigil — Know before they notice.",
    template: "%s · Vigil",
  },
  description:
    "Self-hosted API performance and uptime monitoring, designed for Go and PostgreSQL. Explore the built Next.js dashboard with labelled sample data and a live API status card; a standalone Go probe worker writes checks and incidents to PostgreSQL.",
  keywords: [
    "API monitoring",
    "uptime monitor",
    "status page",
    "Golang",
    "PostgreSQL",
    "observability",
  ],
  openGraph: {
    title: "Vigil — Know before they notice.",
    description:
      "Self-hosted API monitoring designed for Go, PostgreSQL, and Next.js. Preview dashboard with labelled sample data, a live API status card, and a built Go probe worker.",
    type: "website",
    url: appUrl,
    siteName: "Vigil",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vigil — Know before they notice.",
    description:
      "Self-hosted API monitoring designed for Go, PostgreSQL, and Next.js. Preview dashboard with labelled sample data, a live API status card, and a built Go probe worker.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        geistSans.variable,
        geistMono.variable,
        instrumentSerif.variable,
      )}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
