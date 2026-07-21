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
  title: "Lanework — The agentic operating system for logistics",
  description:
    "Lanework is a team of AI agents that track shipments, manage inventory, optimize routes, and handle the thousand small decisions your ops team makes every day.",
  authors: [{ name: "Lanework" }],
  openGraph: {
    title: "Lanework — The agentic operating system for logistics",
    description:
      "AI agents that run your logistics operation alongside your existing TMS, WMS, and ERP.",
    type: "website",
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
