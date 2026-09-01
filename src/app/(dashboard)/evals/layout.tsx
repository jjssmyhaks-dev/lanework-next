import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Evaluations",
  description: "Run and monitor AI agent evaluations to ensure accuracy and reliability.",
};

export default function EvalsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
