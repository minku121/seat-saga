import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#050505" };

export const metadata: Metadata = {
  title: "Seat Saga: Concert tickets with a live seat map",
  description: "Pick your exact seat, see the view, and book concert tickets in under a minute.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}