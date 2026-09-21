import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HARSI — Session trading terminal",
  description:
    "Research signals for London HARSI, Pulse Confluence, and breakout confirmation. Paper trading first. Live brokers stay disconnected until configured.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
