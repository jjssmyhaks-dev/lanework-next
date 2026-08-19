import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lanework — The agentic operating system for logistics",
    template: "%s | Lanework",
  },
  description:
    "Lanework is a team of AI agents that track shipments, manage inventory, optimize routes, and handle the thousand small decisions your ops team makes every day.",
  keywords: [
    "logistics", "supply chain", "AI agents", "shipment tracking",
    "inventory management", "route optimization", "Indian logistics",
    "MSME", "warehouse management", "fleet management",
  ],
  authors: [{ name: "Lanework" }],
  creator: "Lanework",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://lanework-next-delta.vercel.app"),
  openGraph: {
    title: "Lanework — The agentic operating system for logistics",
    description:
      "AI agents that run your logistics operation alongside your existing TMS, WMS, and ERP.",
    type: "website",
    siteName: "Lanework",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lanework — The agentic operating system for logistics",
    description:
      "AI agents that run your logistics operation alongside your existing TMS, WMS, and ERP.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
