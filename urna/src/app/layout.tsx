import type { Metadata } from "next";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  // metadataBase lets Next.js build absolute URLs for the opengraph
  // and twitter image routes. Without it, some crawlers (notably
  // Slack and Discord) can't resolve the preview card on first fetch.
  metadataBase: new URL(appUrl),
  title: {
    default: "Urna — the ballot box for the internet",
    template: "%s · Urna",
  },
  description:
    "Host a real, verifiable election in under a minute. Single-choice, approval, and ranked-choice voting. No voter sign-up required.",
  applicationName: "Urna",
  keywords: [
    "voting",
    "elections",
    "ranked choice",
    "approval voting",
    "polls",
    "decisions",
  ],
  openGraph: {
    type: "website",
    title: "Urna — the ballot box for the internet",
    description:
      "Host a real, verifiable election in under a minute. No voter sign-up required.",
    siteName: "Urna",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Urna — the ballot box for the internet",
    description:
      "Host a real, verifiable election in under a minute. No voter sign-up required.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
