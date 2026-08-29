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
    "Marshmallow is a daily experiment about money, choices, and the point where your answer changes.",
  openGraph: {
    title: "Marshmallow — What's your price?",
    description:
      "Money changes people. Find out where it changes you. One uncomfortable money experiment every day.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marshmallow — What's your price?",
    description:
      "A daily experiment about money, choices, and the point where your answer changes.",
  },
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
