import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-[#1a1a2e]/10 mb-4">404</div>
        <h1 className="text-3xl font-semibold text-[#1a1a2e]">Page not found</h1>
        <p className="mt-3 text-[#1a1a2e]/60">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a2e] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 transition-colors"
          >
            <Home className="h-4 w-4" /> Go home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e5e7eb] px-5 py-2.5 text-sm font-medium text-[#1a1a2e] hover:bg-gray-50 transition-colors"
          >
            Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
