import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";

import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Marshmallow",
    template: "%s · Marshmallow",
  },
  description:
    "A daily experiment in being human. Make your call, predict the crowd, and come back for the reveal.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4ebe0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas font-sans text-ink">{children}</body>
    </html>
  );
}
